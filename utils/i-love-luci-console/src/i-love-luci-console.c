#define _GNU_SOURCE

#include <arpa/inet.h>
#include <ctype.h>
#include <errno.h>
#include <fcntl.h>
#include <signal.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/ioctl.h>
#include <sys/select.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/time.h>
#include <sys/types.h>
#include <sys/un.h>
#include <sys/wait.h>
#include <termios.h>
#include <time.h>
#include <unistd.h>

#define CONTROL_SOCKET "/var/run/i-love-luci-console/control.sock"
#define RUNTIME_DIR "/var/run/i-love-luci-console"
#define MAX_SESSIONS 4
#define SESSION_ID_BYTES 16
#define SESSION_ID_CHARS (SESSION_ID_BYTES * 2)
#define BUFFER_CAPACITY 65536
#define IDLE_TIMEOUT_SECONDS 600

struct session {
	bool used;
	char id[SESSION_ID_CHARS + 1];
	pid_t pid;
	int master_fd;
	char buffer[BUFFER_CAPACITY];
	size_t buffer_len;
	unsigned long long base_sequence;
	unsigned long long next_sequence;
	time_t last_active;
};

static struct session sessions[MAX_SESSIONS];

static long long now_ms(void) {
	struct timeval tv;

	gettimeofday(&tv, NULL);
	return ((long long)tv.tv_sec * 1000LL) + (tv.tv_usec / 1000);
}

static void json_escape_write(FILE *out, const char *value, size_t len) {
	for (size_t i = 0; i < len; i++) {
		unsigned char c = (unsigned char)value[i];

		switch (c) {
		case '\\':
			fputs("\\\\", out);
			break;
		case '"':
			fputs("\\\"", out);
			break;
		case '\b':
			fputs("\\b", out);
			break;
		case '\f':
			fputs("\\f", out);
			break;
		case '\n':
			fputs("\\n", out);
			break;
		case '\r':
			fputs("\\r", out);
			break;
		case '\t':
			fputs("\\t", out);
			break;
		default:
			if (c < 0x20) {
				fprintf(out, "\\u%04x", c);
			}
			else {
				fputc(c, out);
			}
			break;
		}
	}
}

static void json_error(FILE *out, const char *message) {
	fputs("{\"available\":false,\"active\":false,\"accepted\":false,\"message\":\"", out);
	json_escape_write(out, message, strlen(message));
	fputs("\"}\n", out);
}

static int make_runtime_dir(void) {
	if (mkdir(RUNTIME_DIR, 0700) == -1 && errno != EEXIST) {
		return -1;
	}

	return chmod(RUNTIME_DIR, 0700);
}

static int set_nonblock(int fd) {
	int flags = fcntl(fd, F_GETFL, 0);

	if (flags == -1) {
		return -1;
	}

	return fcntl(fd, F_SETFL, flags | O_NONBLOCK);
}

static void set_cloexec(int fd) {
	int flags = fcntl(fd, F_GETFD, 0);

	if (flags >= 0) {
		fcntl(fd, F_SETFD, flags | FD_CLOEXEC);
	}
}

static bool generate_session_id(char id[SESSION_ID_CHARS + 1]) {
	unsigned char bytes[SESSION_ID_BYTES];
	int fd = open("/dev/urandom", O_RDONLY | O_CLOEXEC);

	if (fd < 0) {
		return false;
	}

	ssize_t read_count = read(fd, bytes, sizeof(bytes));
	close(fd);

	if (read_count != (ssize_t)sizeof(bytes)) {
		return false;
	}

	for (size_t i = 0; i < sizeof(bytes); i++) {
		snprintf(id + (i * 2), 3, "%02x", bytes[i]);
	}

	id[SESSION_ID_CHARS] = '\0';
	return true;
}

static struct session *find_session(const char *id) {
	if (!id || strlen(id) != SESSION_ID_CHARS) {
		return NULL;
	}

	for (size_t i = 0; i < SESSION_ID_CHARS; i++) {
		if (!isxdigit((unsigned char)id[i])) {
			return NULL;
		}
	}

	for (size_t i = 0; i < MAX_SESSIONS; i++) {
		if (sessions[i].used && strcmp(sessions[i].id, id) == 0) {
			return &sessions[i];
		}
	}

	return NULL;
}

static void close_session(struct session *session) {
	if (!session || !session->used) {
		return;
	}

	if (session->master_fd >= 0) {
		close(session->master_fd);
	}

	if (session->pid > 0) {
		kill(session->pid, SIGHUP);
		waitpid(session->pid, NULL, WNOHANG);
	}

	memset(session, 0, sizeof(*session));
	session->master_fd = -1;
}

static void cleanup_sessions(void) {
	time_t now = time(NULL);

	for (size_t i = 0; i < MAX_SESSIONS; i++) {
		struct session *session = &sessions[i];

		if (!session->used) {
			continue;
		}

		if (waitpid(session->pid, NULL, WNOHANG) == session->pid) {
			close_session(session);
			continue;
		}

		if (now - session->last_active > IDLE_TIMEOUT_SECONDS) {
			close_session(session);
		}
	}
}

static void append_output(struct session *session, const char *data, size_t len) {
	if (len == 0) {
		return;
	}

	if (len >= BUFFER_CAPACITY) {
		data += len - BUFFER_CAPACITY;
		session->base_sequence = session->next_sequence + len - BUFFER_CAPACITY;
		session->buffer_len = 0;
		len = BUFFER_CAPACITY;
	}

	if (session->buffer_len + len > BUFFER_CAPACITY) {
		size_t drop = session->buffer_len + len - BUFFER_CAPACITY;
		memmove(session->buffer, session->buffer + drop, session->buffer_len - drop);
		session->buffer_len -= drop;
		session->base_sequence += drop;
	}

	memcpy(session->buffer + session->buffer_len, data, len);
	session->buffer_len += len;
	session->next_sequence += len;
}

static void drain_session_output(struct session *session) {
	char chunk[4096];

	for (;;) {
		ssize_t count = read(session->master_fd, chunk, sizeof(chunk));

		if (count > 0) {
			append_output(session, chunk, (size_t)count);
			continue;
		}

		if (count == 0) {
			close_session(session);
		}

		if (count < 0 && errno != EAGAIN && errno != EWOULDBLOCK && errno != EINTR) {
			close_session(session);
		}

		break;
	}
}

static int open_pty_pair(int *master_fd, int *slave_fd) {
	int master = posix_openpt(O_RDWR | O_NOCTTY | O_CLOEXEC);

	if (master < 0) {
		return -1;
	}

	if (grantpt(master) < 0 || unlockpt(master) < 0) {
		close(master);
		return -1;
	}

	char *slave_name = ptsname(master);

	if (!slave_name) {
		close(master);
		return -1;
	}

	int slave = open(slave_name, O_RDWR | O_NOCTTY);

	if (slave < 0) {
		close(master);
		return -1;
	}

	*master_fd = master;
	*slave_fd = slave;
	return 0;
}

static void child_exec_login(int slave_fd) {
	setsid();
	ioctl(slave_fd, TIOCSCTTY, 0);
	dup2(slave_fd, STDIN_FILENO);
	dup2(slave_fd, STDOUT_FILENO);
	dup2(slave_fd, STDERR_FILENO);

	if (slave_fd > STDERR_FILENO) {
		close(slave_fd);
	}

	execl("/bin/login", "login", "-f", "root", (char *)NULL);
	execl("/bin/sh", "sh", "-l", (char *)NULL);
	_exit(127);
}

static struct session *create_session(void) {
	struct session *slot = NULL;

	for (size_t i = 0; i < MAX_SESSIONS; i++) {
		if (!sessions[i].used) {
			slot = &sessions[i];
			break;
		}
	}

	if (!slot) {
		return NULL;
	}

	int master_fd = -1;
	int slave_fd = -1;

	if (open_pty_pair(&master_fd, &slave_fd) < 0) {
		return NULL;
	}

	pid_t pid = fork();

	if (pid < 0) {
		close(master_fd);
		close(slave_fd);
		return NULL;
	}

	if (pid == 0) {
		close(master_fd);
		child_exec_login(slave_fd);
	}

	close(slave_fd);

	if (set_nonblock(master_fd) < 0) {
		close(master_fd);
		kill(pid, SIGHUP);
		return NULL;
	}

	memset(slot, 0, sizeof(*slot));
	slot->used = true;
	slot->pid = pid;
	slot->master_fd = master_fd;
	slot->last_active = time(NULL);

	if (!generate_session_id(slot->id)) {
		close_session(slot);
		return NULL;
	}

	return slot;
}

static int hex_value(char c) {
	if (c >= '0' && c <= '9') {
		return c - '0';
	}
	if (c >= 'a' && c <= 'f') {
		return c - 'a' + 10;
	}
	if (c >= 'A' && c <= 'F') {
		return c - 'A' + 10;
	}
	return -1;
}

static size_t decode_hex(const char *hex, unsigned char *out, size_t out_len) {
	size_t len = strlen(hex);
	size_t written = 0;

	for (size_t i = 0; i + 1 < len && written < out_len; i += 2) {
		int hi = hex_value(hex[i]);
		int lo = hex_value(hex[i + 1]);

		if (hi < 0 || lo < 0) {
			break;
		}

		out[written++] = (unsigned char)((hi << 4) | lo);
	}

	return written;
}

static void handle_launch(FILE *out) {
	struct session *session = create_session();

	if (!session) {
		json_error(out, "No console session slots available.");
		return;
	}

	fprintf(out,
		"{\"available\":true,\"active\":true,\"accepted\":true,\"session_id\":\"%s\",\"sessionId\":\"%s\",\"sequence\":%llu,\"expiresAt\":%lld,\"pollAfterMs\":100,\"message\":\"Console session opened.\"}\n",
		session->id,
		session->id,
		session->next_sequence,
		now_ms() + (IDLE_TIMEOUT_SECONDS * 1000LL));
}

static void handle_poll(FILE *out, char *id, char *sequence_text) {
	struct session *session = find_session(id);

	if (!session) {
		json_error(out, "Console session was not found.");
		return;
	}

	session->last_active = time(NULL);
	drain_session_output(session);

	if (!session->used) {
		json_error(out, "Console session ended.");
		return;
	}

	unsigned long long sequence = strtoull(sequence_text ? sequence_text : "0", NULL, 10);
	size_t offset = 0;

	if (sequence > session->base_sequence) {
		unsigned long long relative = sequence - session->base_sequence;
		offset = relative > session->buffer_len ? session->buffer_len : (size_t)relative;
	}

	fputs("{\"available\":true,\"active\":true,\"output\":\"", out);
	json_escape_write(out, session->buffer + offset, session->buffer_len - offset);
	fprintf(out, "\",\"sequence\":%llu,\"baseSequence\":%llu}\n", session->next_sequence, session->base_sequence);
}

static void handle_write(FILE *out, char *id, char *hex_input) {
	struct session *session = find_session(id);

	if (!session) {
		json_error(out, "Console session was not found.");
		return;
	}

	unsigned char bytes[4096];
	size_t len = decode_hex(hex_input ? hex_input : "", bytes, sizeof(bytes));

	if (len == 0) {
		json_error(out, "No console input was supplied.");
		return;
	}

	session->last_active = time(NULL);
	ssize_t written = write(session->master_fd, bytes, len);

	fprintf(out,
		"{\"available\":true,\"active\":true,\"accepted\":%s,\"written\":%zd,\"message\":\"Console input %s.\"}\n",
		written > 0 ? "true" : "false",
		written,
		written > 0 ? "accepted" : "rejected");
}

static void handle_resize(FILE *out, char *id, char *cols_text, char *rows_text) {
	struct session *session = find_session(id);

	if (!session) {
		json_error(out, "Console session was not found.");
		return;
	}

	struct winsize size = {
		.ws_col = (unsigned short)strtoul(cols_text ? cols_text : "80", NULL, 10),
		.ws_row = (unsigned short)strtoul(rows_text ? rows_text : "24", NULL, 10)
	};

	if (size.ws_col < 20) {
		size.ws_col = 80;
	}
	if (size.ws_row < 5) {
		size.ws_row = 24;
	}

	session->last_active = time(NULL);
	int rc = ioctl(session->master_fd, TIOCSWINSZ, &size);

	fprintf(out,
		"{\"available\":true,\"active\":true,\"accepted\":%s,\"message\":\"Console resize %s.\"}\n",
		rc == 0 ? "true" : "false",
		rc == 0 ? "accepted" : "rejected");
}

static void handle_close(FILE *out, char *id) {
	struct session *session = find_session(id);

	if (!session) {
		json_error(out, "Console session was not found.");
		return;
	}

	close_session(session);
	fputs("{\"available\":true,\"active\":false,\"accepted\":true,\"message\":\"Console session closed.\"}\n", out);
}

static void handle_command(FILE *out, char *line) {
	char *saveptr = NULL;
	char *command = strtok_r(line, "\t \r\n", &saveptr);

	if (!command) {
		json_error(out, "Missing command.");
		return;
	}

	cleanup_sessions();

	if (strcmp(command, "status") == 0) {
		fprintf(out, "{\"available\":true,\"active\":true,\"maxSessions\":%d,\"idleTimeout\":%d}\n", MAX_SESSIONS, IDLE_TIMEOUT_SECONDS);
	}
	else if (strcmp(command, "launch") == 0) {
		handle_launch(out);
	}
	else if (strcmp(command, "poll") == 0) {
		char *id = strtok_r(NULL, "\t \r\n", &saveptr);
		char *sequence = strtok_r(NULL, "\t \r\n", &saveptr);
		handle_poll(out, id, sequence);
	}
	else if (strcmp(command, "write") == 0) {
		char *id = strtok_r(NULL, "\t \r\n", &saveptr);
		char *input = strtok_r(NULL, "\t \r\n", &saveptr);
		handle_write(out, id, input);
	}
	else if (strcmp(command, "resize") == 0) {
		char *id = strtok_r(NULL, "\t \r\n", &saveptr);
		char *columns = strtok_r(NULL, "\t \r\n", &saveptr);
		char *rows = strtok_r(NULL, "\t \r\n", &saveptr);
		handle_resize(out, id, columns, rows);
	}
	else if (strcmp(command, "close") == 0) {
		char *id = strtok_r(NULL, "\t \r\n", &saveptr);
		handle_close(out, id);
	}
	else {
		json_error(out, "Unknown command.");
	}
}

static int create_server_socket(void) {
	if (make_runtime_dir() < 0) {
		return -1;
	}

	int fd = socket(AF_UNIX, SOCK_STREAM, 0);

	if (fd < 0) {
		return -1;
	}

	set_cloexec(fd);

	struct sockaddr_un addr = {0};
	addr.sun_family = AF_UNIX;
	snprintf(addr.sun_path, sizeof(addr.sun_path), "%s", CONTROL_SOCKET);

	unlink(CONTROL_SOCKET);

	if (bind(fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
		close(fd);
		return -1;
	}

	if (chmod(CONTROL_SOCKET, 0600) < 0 || chown(CONTROL_SOCKET, 0, 0) < 0) {
		close(fd);
		unlink(CONTROL_SOCKET);
		return -1;
	}

	if (listen(fd, 8) < 0) {
		close(fd);
		return -1;
	}

	return fd;
}

static void serve_client(int client_fd) {
	char line[8192];
	ssize_t len = read(client_fd, line, sizeof(line) - 1);

	if (len <= 0) {
		return;
	}

	line[len] = '\0';

	int out_fd = dup(client_fd);

	if (out_fd < 0) {
		return;
	}

	set_cloexec(out_fd);

	FILE *out = fdopen(out_fd, "w");

	if (!out) {
		close(out_fd);
		return;
	}

	handle_command(out, line);
	fclose(out);
}

static int run_daemon(void) {
	signal(SIGPIPE, SIG_IGN);

	for (size_t i = 0; i < MAX_SESSIONS; i++) {
		sessions[i].master_fd = -1;
	}

	int server_fd = create_server_socket();

	if (server_fd < 0) {
		perror("create_server_socket");
		return 1;
	}

	for (;;) {
		fd_set read_fds;
		int max_fd = server_fd;

		FD_ZERO(&read_fds);
		FD_SET(server_fd, &read_fds);

		for (size_t i = 0; i < MAX_SESSIONS; i++) {
			if (sessions[i].used && sessions[i].master_fd >= 0) {
				FD_SET(sessions[i].master_fd, &read_fds);
				if (sessions[i].master_fd > max_fd) {
					max_fd = sessions[i].master_fd;
				}
			}
		}

		struct timeval timeout = {
			.tv_sec = 1,
			.tv_usec = 0
		};

		int ready = select(max_fd + 1, &read_fds, NULL, NULL, &timeout);

		if (ready < 0) {
			if (errno == EINTR) {
				continue;
			}
			perror("select");
			break;
		}

		if (FD_ISSET(server_fd, &read_fds)) {
			int client_fd = accept(server_fd, NULL, NULL);

			if (client_fd >= 0) {
				set_cloexec(client_fd);
				serve_client(client_fd);
				close(client_fd);
			}
		}

		for (size_t i = 0; i < MAX_SESSIONS; i++) {
			if (sessions[i].used && sessions[i].master_fd >= 0 && FD_ISSET(sessions[i].master_fd, &read_fds)) {
				drain_session_output(&sessions[i]);
			}
		}

		cleanup_sessions();
	}

	close(server_fd);
	unlink(CONTROL_SOCKET);
	return 1;
}

static int run_client(int argc, char **argv) {
	int fd = socket(AF_UNIX, SOCK_STREAM, 0);

	if (fd < 0) {
		json_error(stdout, "Cannot create helper client socket.");
		return 1;
	}

	set_cloexec(fd);

	struct sockaddr_un addr = {0};
	addr.sun_family = AF_UNIX;
	snprintf(addr.sun_path, sizeof(addr.sun_path), "%s", CONTROL_SOCKET);

	if (connect(fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
		close(fd);
		json_error(stdout, "Console tunnel helper is not running.");
		return 1;
	}

	for (int i = 1; i < argc; i++) {
		if (i > 1) {
			write(fd, "\t", 1);
		}
		write(fd, argv[i], strlen(argv[i]));
	}
	write(fd, "\n", 1);

	char buffer[4096];
	ssize_t len;

	while ((len = read(fd, buffer, sizeof(buffer))) > 0) {
		fwrite(buffer, 1, (size_t)len, stdout);
	}

	close(fd);
	return 0;
}

int main(int argc, char **argv) {
	if (argc >= 2 && strcmp(argv[1], "daemon") == 0) {
		return run_daemon();
	}

	if (argc >= 2 && strcmp(argv[1], "--version") == 0) {
		puts("i-love-luci-console 1.0.0");
		return 0;
	}

	if (argc < 2) {
		fprintf(stderr, "usage: %s daemon|status|launch|poll|write|resize|close\n", argv[0]);
		return 2;
	}

	return run_client(argc, argv);
}
