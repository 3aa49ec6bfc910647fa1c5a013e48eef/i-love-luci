#!/usr/bin/env ucode

'use strict';

import { cursor } from 'uci';
import { connect } from 'ubus';
import { glob, mkstemp, open, popen, readfile, stat, writefile } from 'fs';

const uci = cursor();
const ubus = connect();
const menuRoot = '/usr/share/luci/menu.d/*.json';
const sshAuthorizedKeysPath = '/etc/dropbear/authorized_keys';
const rcLocalPath = '/etc/rc.local';
const hiddenNavigation = {
	'/admin': true,
	'/admin/menu': true,
	'/admin/logout': true,
	'/admin/uci': true,
	'/admin/i-love-luci': true
};
const nativeRoutes = {
	'/admin/status': { status: 'supported', nativePath: '/' },
	'/admin/status/overview': { status: 'supported', nativePath: '/' },
	'/admin/status/routes': { status: 'supported', nativePath: '/native/status-routes' },
	'/admin/status/nftables': { status: 'supported', nativePath: '/native/firewall-status' },
	'/admin/status/logs': { status: 'supported', nativePath: '/native/logs' },
	'/admin/status/logs/syslog': { status: 'supported', nativePath: '/native/logs' },
	'/admin/status/logs/dmesg': { status: 'supported', nativePath: '/native/logs' },
	'/admin/status/processes': { status: 'supported', nativePath: '/native/processes' },
	'/admin/status/realtime': { status: 'supported', nativePath: '/realtime' },
	'/admin/status/realtime/load': { status: 'supported', nativePath: '/realtime' },
	'/admin/status/realtime/bandwidth': { status: 'supported', nativePath: '/realtime' },
	'/admin/status/realtime/connections': { status: 'supported', nativePath: '/native/connections' },
	'/admin/status/realtime/wireless': { status: 'compat', nativePath: '/native/wireless' },
	'/admin/status/channel_analysis': { status: 'compat', nativePath: '/native/wireless' },
	'/admin/network': { status: 'compat', nativePath: '/core/network' },
	'/admin/network/network': { status: 'compat', nativePath: '/core/network' },
	'/admin/network/routes': { status: 'supported', nativePath: '/core/network-routes' },
	'/admin/network/wireless': { status: 'compat', nativePath: '/native/wireless' },
	'/admin/network/diagnostics': { status: 'supported', nativePath: '/native/diagnostics' },
	'/admin/network/dhcp': { status: 'supported', nativePath: '/core/dhcp' },
	'/admin/network/dns': { status: 'supported', nativePath: '/core/dhcp' },
	'/admin/network/firewall': { status: 'supported', nativePath: '/core/firewall' },
	'/admin/network/firewall/zones': { status: 'supported', nativePath: '/core/firewall' },
	'/admin/network/firewall/forwards': { status: 'supported', nativePath: '/core/firewall' },
	'/admin/network/firewall/rules': { status: 'supported', nativePath: '/core/firewall' },
	'/admin/network/firewall/snats': { status: 'supported', nativePath: '/core/firewall' },
	'/admin/network/firewall/ipsets': { status: 'supported', nativePath: '/core/firewall' },
	'/admin/network/firewall/custom': { status: 'supported', nativePath: '/core/firewall' },
	'/admin/system': { status: 'supported', nativePath: '/core/system' },
	'/admin/system/system': { status: 'supported', nativePath: '/core/system' },
	'/admin/system/admin': { status: 'supported', nativePath: '/native/password' },
	'/admin/system/admin/password': { status: 'supported', nativePath: '/native/password' },
	'/admin/system/admin/dropbear': { status: 'supported', nativePath: '/native/service/dropbear' },
	'/admin/system/admin/sshkeys': { status: 'supported', nativePath: '/native/sshkeys' },
	'/admin/system/admin/uhttpd': { status: 'supported', nativePath: '/native/service/uhttpd' },
	'/admin/system/admin/repokeys': { status: 'supported', nativePath: '/native/repokeys' },
	'/admin/system/attendedsysupgrade': { status: 'compat', nativePath: '/native/attendedsysupgrade', autoMode: 'legacy' },
	'/admin/system/attendedsysupgrade/overview': { status: 'compat', nativePath: '/native/attendedsysupgrade', autoMode: 'legacy' },
	'/admin/system/attendedsysupgrade/configuration': { status: 'supported', nativePath: '/native/attendedsysupgrade-config' },
	'/admin/system/package-manager': { status: 'compat', nativePath: '/native/packages', autoMode: 'legacy' },
	'/admin/system/startup': { status: 'supported', nativePath: '/native/startup' },
	'/admin/system/crontab': { status: 'supported', nativePath: '/native/crontab' },
	'/admin/system/flash': { status: 'compat', nativePath: '/native/flash' },
	'/admin/system/commands': { status: 'supported', nativePath: '/native/service/commands' },
	'/admin/system/commands/dashboard': { status: 'supported', nativePath: '/native/service/commands' },
	'/admin/system/commands/config': { status: 'supported', nativePath: '/native/service/commands' },
	'/admin/system/i-love-luci-theme': { status: 'supported', nativePath: '/settings' },
	'/admin/system/reboot': { status: 'supported', nativePath: '/native/reboot' },
	'/admin/system/leds': { status: 'supported', nativePath: '/native/leds' },
	'/admin/services': { status: 'supported', nativePath: '/native/services' },
	'/admin/services/banip': { status: 'compat', nativePath: '/native/service/banip', autoMode: 'legacy' },
	'/admin/services/banip/overview': { status: 'compat', nativePath: '/native/service/banip', autoMode: 'legacy' },
	'/admin/services/banip/allowlist': { status: 'compat', nativePath: '/native/service/banip/allowlist', autoMode: 'legacy' },
	'/admin/services/banip/blocklist': { status: 'compat', nativePath: '/native/service/banip/blocklist', autoMode: 'legacy' },
	'/admin/services/banip/feeds': { status: 'compat', nativePath: '/native/service/banip/feeds', autoMode: 'legacy' },
	'/admin/services/banip/setreport': { status: 'compat', nativePath: '/native/service/banip/setreport', autoMode: 'legacy' },
	'/admin/services/banip/firewall_log': { status: 'compat', nativePath: '/native/service/banip/firewall_log', autoMode: 'legacy' },
	'/admin/services/banip/processing_log': { status: 'compat', nativePath: '/native/service/banip/processing_log', autoMode: 'legacy' },
	'/admin/services/adblock-fast': { status: 'compat', nativePath: '/native/service/adblock-fast', autoMode: 'legacy' },
	'/admin/services/upnp': { status: 'supported', nativePath: '/native/service/upnpd' },
	'/admin/services/uhttpd': { status: 'supported', nativePath: '/native/service/uhttpd' }
};
const servicePackages = {
	'adblock-fast': {
		package: 'adblock-fast',
		init: 'adblock-fast',
		title: 'AdBlock Fast',
		compatPath: '/admin/services/adblock-fast',
		sections: ['adblock-fast', 'file_url'],
		logPattern: 'adblock-fast',
		files: [
			{ title: 'Generated dnsmasq servers', path: '/tmp/run/adblock-fast/dnsmasq.servers' }
		]
	},
	banip: {
		package: 'banip',
		init: 'banip',
		title: 'banIP',
		compatPath: '/admin/services/banip',
		sections: ['banip'],
		logPattern: 'banip',
		files: [
			{ title: 'Allowlist', path: '/etc/banip/banip.allowlist', editable: true },
			{ title: 'Blocklist', path: '/etc/banip/banip.blocklist', editable: true },
			{ title: 'Custom feeds', path: '/etc/banip/banip.custom.feeds', editable: true },
			{ title: 'Runtime status', path: '/tmp/run/banIP/banIP.runtime.json' }
		]
	},
	commands: { package: 'luci', init: null, title: 'Custom Commands', sections: ['command'] },
	dropbear: { package: 'dropbear', init: 'dropbear', title: 'Dropbear SSH', sections: ['dropbear'], logPattern: 'dropbear' },
	uhttpd: { package: 'uhttpd', init: 'uhttpd', title: 'uHTTPd', sections: ['uhttpd', 'cert', 'cert_defaults'], logPattern: 'uhttpd' },
	upnpd: {
		package: 'upnpd',
		init: 'miniupnpd',
		title: 'UPnP IGD & PCP',
		sections: ['upnpd', 'perm_rule'],
		logPattern: 'miniupnpd|upnpd',
		files: [
			{ title: 'Lease file', path: '/var/run/miniupnpd.leases' }
		]
	}
};
const routeModes = {
	auto: true,
	modern: true,
	legacy: true,
	hidden: true
};
const initActions = {
	enable: true,
	disable: true,
	start: true,
	stop: true,
	restart: true,
	status: true
};

function respond(data) {
	return {
		ok: true,
		data
	};
}

function read_jsonfile(path, defval) {
	try {
		return json(open(path, 'r'));
	}
	catch (e) {
		return defval;
	}
}

function normalize_path(path) {
	let value = '/' + trim(path || '', '/');
	return value == '/' ? value : replace(value, /\/+$/g, '');
}

function parent_path(path) {
	let parts = split(trim(path, '/'), '/');

	if (length(parts) <= 1)
		return null;

	pop(parts);
	return '/' + join('/', parts);
}

function route_id(path) {
	return replace(trim(path, '/'), /[^A-Za-z0-9]+/g, '-');
}

function action_type(spec) {
	return spec?.action?.type || 'unknown';
}

function action_path(spec) {
	return spec?.action?.path || null;
}

function is_hidden_path(path) {
	return hiddenNavigation[path] ||
		index(path, '*') > -1 ||
		index(path, '/admin/ubus') == 0 ||
		index(path, '/admin/uci') == 0 ||
		index(path, '/admin/translations') == 0;
}

function check_fs_depends(spec) {
	for (let path, kind in spec) {
		let info = stat(path);

		if (kind == 'directory') {
			if (info?.type != 'directory')
				return false;
		}
		else if (kind == 'executable') {
			if (info?.type != 'file' || info?.user_exec == false)
				return false;
		}
		else if (kind == 'file') {
			if (info?.type != 'file')
				return false;
		}
		else if (kind == 'absent') {
			if (info != null)
				return false;
		}
	}

	return true;
}

function check_uci_depends(spec) {
	for (let config, sections in spec) {
		try {
			uci.load(config);
		}
		catch (e) {
			return false;
		}

		for (let section, options in sections) {
			let found = false;

			if (index(section, '@') == 0) {
				let section_type = substr(section, 1);
				uci.foreach(config, section_type, function(s) {
					if (type(options) != 'object') {
						found = true;
						return;
					}

					let matches = true;
					for (let option, expected in options) {
						let current = s[option];

						if (expected == true) {
							if (current == null || current == '') {
								matches = false;
								break;
							}
						}
						else if (current != expected) {
							matches = false;
							break;
						}
					}

					if (matches)
						found = true;
				});
			}
			else {
				found = uci.get(config, section) != null;

				if (found && type(options) == 'object') {
					for (let option, expected in options) {
						let current = uci.get(config, section, option);

						if (expected == true) {
							if (current == null || current == '')
								return false;
						}
						else if (current != expected) {
							return false;
						}
					}
				}
			}

			if (!found)
				return false;
		}
	}

	return true;
}

function depends_satisfied(depends) {
	if (type(depends) != 'object')
		return true;

	if (type(depends.fs) == 'array') {
		let matched = false;

		for (let fs_spec in depends.fs)
			if (check_fs_depends(fs_spec))
				matched = true;

		if (!matched)
			return false;
	}
	else if (type(depends.fs) == 'object' && !check_fs_depends(depends.fs)) {
		return false;
	}

	if (type(depends.uci) == 'object' && !check_uci_depends(depends.uci))
		return false;

	return true;
}

function basename_path(path) {
	let parts = split(trim(path, '/'), '/');
	return parts[length(parts) - 1];
}

function first_child_path(entry, entries) {
	const preferred = entry.preferredChild;
	const prefix = entry.path + '/';
	let children = [];

	for (let child in entries) {
		if (child.parentPath == entry.path && child.eligible && !child.hidden && !child.firstchildIneligible)
			push(children, child);
	}

	sort(children, function(a, b) {
		if (preferred && basename_path(a.path) == preferred)
			return -1;

		if (preferred && basename_path(b.path) == preferred)
			return 1;

		return a.order == b.order ? (a.title > b.title ? 1 : -1) : a.order - b.order;
	});

	if (length(children))
		return children[0].path;

	for (let child in entries) {
		if (index(child.path, prefix) == 0 && child.eligible && !child.hidden && !child.firstchildIneligible)
			push(children, child);
	}

	sort(children, function(a, b) {
		return a.depth == b.depth ? (a.order == b.order ? (a.title > b.title ? 1 : -1) : a.order - b.order) : a.depth - b.depth;
	});

	return length(children) ? children[0].path : null;
}

function resolve_entry_path(entry, entries_by_path, entries) {
	if (entry.actionType == 'alias' && entry.actionPath)
		return normalize_path(entry.actionPath);

	if (entry.actionType == 'firstchild')
		return first_child_path(entry, entries) || entry.path;

	return entry.path;
}

function build_menu_tree(items) {
	let by_path = {};
	let roots = [];

	for (let item in items) {
		let clone = { ...item, children: [] };

		by_path[item.path] = clone;
	}

	for (let item in items) {
		let clone = by_path[item.path];

		if (item.parentPath && by_path[item.parentPath])
			push(by_path[item.parentPath].children, clone);
		else
			push(roots, clone);
	}

	function sort_items(list) {
		sort(list, function(a, b) {
			return a.order == b.order ? (a.title > b.title ? 1 : -1) : a.order - b.order;
		});

		for (let item in list)
			sort_items(item.children);
	}

	sort_items(roots);

	return roots;
}

function load_route_modes() {
	let modes = {};

	uci.load('i-love-luci');
	uci.foreach('i-love-luci', 'route', function(s) {
		if (s.path && routeModes[s.mode])
			modes[s.path] = s.mode;
	});

	return modes;
}

function effective_mode(configuredMode, nativeStatus, autoMode) {
	let native_supported = nativeStatus == 'supported';

	if (configuredMode == 'hidden')
		return 'hidden';

	if (configuredMode == 'legacy')
		return 'legacy';

	if (configuredMode == 'modern')
		return native_supported ? 'modern' : 'legacy';

	if (autoMode == 'legacy')
		return 'legacy';

	if (autoMode == 'modern')
		return native_supported ? 'modern' : 'legacy';

	return nativeStatus == 'supported' ? 'modern' : 'legacy';
}

function clone_section(section) {
	let values = {};

	for (let key, value in section) {
		if (index(key, '.') == 0)
			continue;

		values[key] = value;
	}

	return {
		name: section['.name'] || '',
		type: section['.type'] || '',
		values
	};
}

function collect_uci_config(package_name, section_types) {
	let sections = [];

	try {
		uci.load(package_name);
	}
	catch (e) {
		return sections;
	}

	if (length(section_types || [])) {
		for (let section_type in section_types) {
			uci.foreach(package_name, section_type, function(section) {
				push(sections, clone_section(section));
			});
		}
	}
	else {
		uci.foreach(package_name, function(section) {
			push(sections, clone_section(section));
		});
	}

	return sections;
}

function shell_output(command) {
	let fd = popen(`${command} 2>&1`, 'r');

	if (!fd)
		return '';

	let output = fd.read('all') || '';
	fd.close();

	return output;
}

function installed_package_version(name) {
	name = replace('' + (name || ''), /[^A-Za-z0-9_.+-]/g, '');

	if (!length(name))
		return '';

	let output = trim(shell_output(`if command -v apk >/dev/null 2>&1; then apk list --installed ${name} 2>/dev/null | sed -n '1p'; else opkg list-installed ${name} 2>/dev/null | sed -n '1p'; fi`));
	let prefix = name + '-';
	let opkg_prefix = name + ' - ';

	if (substr(output, 0, length(opkg_prefix)) == opkg_prefix)
		return trim(substr(output, length(opkg_prefix)));

	if (substr(output, 0, length(prefix)) == prefix) {
		let version = substr(output, length(prefix));
		let space = index(version, ' ');

		return trim(space >= 0 ? substr(version, 0, space) : version);
	}

	return '';
}

function parse_command_args(str) {
	let args = [];

	str = '' + (str || '');

	function isspace(c) {
		if (c == 9 || c == 10 || c == 11 || c == 12 || c == 13 || c == 32)
			return c;
	}

	function isquote(c) {
		if (c == 34 || c == 39 || c == 96)
			return c;
	}

	function isescape(c) {
		if (c == 92)
			return c;
	}

	function ismeta(c) {
		if (c == 36 || c == 92 || c == 96)
			return c;
	}

	function unquote(start, end) {
		let esc, quote, res = [];

		for (let off = start; off < end; off++) {
			const byte = ord(str, off);
			const q = isquote(byte);
			const e = isescape(byte);
			const m = ismeta(byte);

			if (esc) {
				if (!m)
					push(res, 92);

				push(res, byte);
				esc = false;
			}
			else if (e && quote != 39) {
				esc = true;
			}
			else if (q && quote && q == quote) {
				quote = null;
			}
			else if (q && !quote) {
				quote = q;
			}
			else {
				push(res, byte);
			}
		}

		push(args, chr(...res));
	}

	let esc, start, quote;

	for (let off = 0; off <= length(str); off++) {
		const byte = ord(str, off);
		const q = isquote(byte);
		const s = isspace(byte) ?? (byte === null);
		const e = isescape(byte);

		if (esc) {
			esc = false;
		}
		else if (e && quote != 39) {
			esc = true;
			start ??= off;
		}
		else if (q && quote && q == quote) {
			quote = null;
		}
		else if (q && !quote) {
			start ??= off;
			quote = q;
		}
		else if (s && !quote) {
			if (start !== null) {
				unquote(start, off);
				start = null;
			}
		}
		else {
			start ??= off;
		}
	}

	if (quote)
		unquote(start, length(str));

	return args;
}

function quote_command_args(argv) {
	return map(argv, value => match(value, /[^\w.\/|-]/) ? `'${replace(value, "'", "'\\''")}'` : value);
}

function contains_binary(text) {
	for (let off = 0, byte = ord(text); off < length(text); byte = ord(text, ++off))
		if (byte <= 8 || (byte >= 14 && byte <= 31))
			return true;

	return false;
}

function base64_encode(data) {
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	let output = '';
	let total = length(data || '');

	for (let offset = 0; offset < total; offset += 3) {
		let b1 = ord(data, offset);
		let b2 = offset + 1 < total ? ord(data, offset + 1) : 0;
		let b3 = offset + 2 < total ? ord(data, offset + 2) : 0;
		let n = (b1 << 16) | (b2 << 8) | b3;

		output += substr(alphabet, (n >> 18) & 63, 1);
		output += substr(alphabet, (n >> 12) & 63, 1);
		output += offset + 1 < total ? substr(alphabet, (n >> 6) & 63, 1) : '=';
		output += offset + 2 < total ? substr(alphabet, n & 63, 1) : '=';
	}

	return output;
}

function base64_decode(data) {
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	data = replace('' + (data || ''), /[^A-Za-z0-9+/=]/g, '');
	let output = '';
	let buffer = 0;
	let bits = 0;

	for (let offset = 0; offset < length(data); offset++) {
		let char = substr(data, offset, 1);

		if (char == '=')
			break;

		let value = index(alphabet, char);

		if (value < 0)
			continue;

		buffer = (buffer << 6) | value;
		bits += 6;

		if (bits >= 8) {
			bits -= 8;
			output += chr((buffer >> bits) & 255);
		}
	}

	return output;
}

function split_lines(text) {
	let lines = split('' + (text || ''), '\n');
	let out = [];

	for (let line in lines) {
		line = trim(line);
		if (length(line))
			push(out, line);
	}

	return out;
}

function safe_read(path) {
	try {
		return readfile(path) || '';
	}
	catch (e) {
		return '';
	}
}

function command_exists(name) {
	return system(`command -v ${name} >/dev/null 2>&1`) == 0;
}

function json_from_command(command, fallback) {
	let output = trim(shell_output(command));

	if (!length(output))
		return fallback;

	try {
		return json(output);
	}
	catch (e) {
		return fallback;
	}
}

function console_helper_call(argv, fallback) {
	if (!command_exists('i-love-luci-console'))
		return fallback;

	return json_from_command(join(' ', quote_command_args(['/usr/sbin/i-love-luci-console', ...argv])), fallback);
}

function hex_encode_text(text) {
	text = '' + (text || '');
	let out = '';

	for (let offset = 0; offset < length(text); offset++)
		out += sprintf('%02x', ord(text, offset));

	return out;
}

function safe_init_name(name) {
	name = name || '';

	return length(name) && replace(name, /[^A-Za-z0-9_.-]/g, '') == name ? name : null;
}

function init_status(name) {
	if (!name)
		return null;

	let script = `/etc/init.d/${name}`;

	if (stat(script)?.type != 'file')
		return null;

	return {
		name,
		enabled: system(`${script} enabled >/dev/null 2>&1`) == 0,
		running: system(`${script} running >/dev/null 2>&1`) == 0
	};
}

function fast_service_state(name) {
	if (!name)
		return null;

	let enabled = false;
	let running = false;
	let service_list = ubus.call('service', 'list') || {};

	for (let path in glob('/etc/rc.d/S*')) {
		let parts = split(path, '/');
		let rc_name = replace(parts[length(parts) - 1], /^S[0-9]+/, '');

		if (rc_name == name) {
			enabled = true;
			break;
		}
	}

	for (let instance_name, instance in service_list[name]?.instances || {}) {
		if (instance?.running) {
			running = true;
			break;
		}
	}

	if (!running)
		running = system(`/etc/init.d/${name} status >/dev/null 2>&1`) == 0;

	return {
		name,
		enabled,
		running
	};
}

function dhcp_leases() {
	let leases = [];
	let text = trim(shell_output(`awk '{ r=$1-systime(); if (r < 0) r=0; h=($4=="*" ? "" : $4); c=($5=="*" ? "" : $5); print r "\\t" $2 "\\t" $3 "\\t" h "\\t" c }' /tmp/dhcp.leases 2>/dev/null`));

	if (!length(text))
		return leases;

	for (let line in split(text, '\n')) {
		if (length(trim(line)))
			push(leases, trim(line));
	}

	sort(leases, function(a, b) {
		let a_parts = split(a, '\t');
		let b_parts = split(b, '\t');
		return a_parts[2] > b_parts[2] ? 1 : -1;
	});

	return leases;
}

function dhcp_status() {
	return {
		dnsmasq: fast_service_state('dnsmasq'),
		odhcpd: fast_service_state('odhcpd'),
		leaseFile: '/tmp/dhcp.leases',
		leaseCount: length(dhcp_leases())
	};
}

function dhcp_static_hosts() {
	let hosts = [];

	try {
		uci.load('dhcp');
	}
	catch (e) {
		return hosts;
	}

	uci.foreach('dhcp', 'host', function(section) {
		push(hosts, {
			section: section['.name'] || '',
			name: section.name || '',
			ip: section.ip || '',
			mac: type(section.mac) == 'array' ? join(', ', section.mac) : (section.mac || ''),
			leasetime: section.leasetime || '',
			duid: type(section.duid) == 'array' ? join(', ', section.duid) : (section.duid || ''),
			hostid: section.hostid || '',
			tag: type(section.tag) == 'array' ? join(', ', section.tag) : (section.tag || ''),
			match_tag: type(section.match_tag) == 'array' ? join(', ', section.match_tag) : (section.match_tag || ''),
			instance: section.instance || '',
			broadcast: section.broadcast || '',
			dns: section.dns || ''
		});
	});

	return hosts;
}

function dhcp_domain_records() {
	let records = [];

	try {
		uci.load('dhcp');
	}
	catch (e) {
		return records;
	}

	uci.foreach('dhcp', 'domain', function(section) {
		push(records, {
			section: section['.name'] || '',
			name: section.name || '',
			ip: section.ip || ''
		});
	});

	return records;
}

function dhcp_relay_rows() {
	let relays = [];

	try {
		uci.load('dhcp');
	}
	catch (e) {
		return relays;
	}

	uci.foreach('dhcp', 'relay', function(section) {
		push(relays, {
			section: section['.name'] || '',
			local_addr: section.local_addr || '',
			server_addr: section.server_addr || '',
			interface: section.interface || ''
		});
	});

	return relays;
}

function dhcp_boot_rows() {
	let boots = [];

	try {
		uci.load('dhcp');
	}
	catch (e) {
		return boots;
	}

	uci.foreach('dhcp', 'boot', function(section) {
		push(boots, {
			section: section['.name'] || '',
			filename: section.filename || '',
			servername: section.servername || '',
			serveraddress: section.serveraddress || '',
			dhcp_option: type(section.dhcp_option) == 'array' ? join('\n', section.dhcp_option) : (section.dhcp_option || ''),
			networkid: section.networkid || '',
			force: section.force || '',
			instance: section.instance || ''
		});
	});

	return boots;
}

function dhcp_boot6_rows() {
	let boots = [];

	try {
		uci.load('dhcp');
	}
	catch (e) {
		return boots;
	}

	uci.foreach('dhcp', 'boot6', function(section) {
		push(boots, {
			section: section['.name'] || '',
			url: section.url || '',
			arch: section.arch || ''
		});
	});

	return boots;
}

function dhcp_tag_rows() {
	let tags = [];

	try {
		uci.load('dhcp');
	}
	catch (e) {
		return tags;
	}

	uci.foreach('dhcp', 'tag', function(section) {
		push(tags, {
			section: section['.name'] || '',
			dhcp_option: type(section.dhcp_option) == 'array' ? join('\n', section.dhcp_option) : (section.dhcp_option || ''),
			force: section.force || ''
		});
	});

	return tags;
}

function dhcp_match_rows() {
	let rows = [];

	try {
		uci.load('dhcp');
	}
	catch (e) {
		return rows;
	}

	uci.foreach('dhcp', 'match', function(section) {
		push(rows, {
			section: section['.name'] || '',
			match: section.match || '',
			networkid: section.networkid || '',
			force: section.force || ''
		});
	});

	return rows;
}

function dhcp_vendorclass_rows() {
	let rows = [];

	try {
		uci.load('dhcp');
	}
	catch (e) {
		return rows;
	}

	uci.foreach('dhcp', 'vendorclass', function(section) {
		push(rows, {
			section: section['.name'] || '',
			vendorclass: section.vendorclass || '',
			networkid: section.networkid || '',
			force: section.force || ''
		});
	});

	return rows;
}

function dhcp_userclass_rows() {
	let rows = [];

	try {
		uci.load('dhcp');
	}
	catch (e) {
		return rows;
	}

	uci.foreach('dhcp', 'userclass', function(section) {
		push(rows, {
			section: section['.name'] || '',
			userclass: section.userclass || '',
			networkid: section.networkid || '',
			force: section.force || ''
		});
	});

	return rows;
}

function dhcp_clean_value(value) {
	value = trim('' + (value || ''));
	return replace(value, /[\r\n]/g, '');
}

function split_dhcp_list(value) {
	let rows = [];

	for (let piece in split(replace('' + (value || ''), /\n/g, ','), ',')) {
		piece = dhcp_clean_value(piece);

		if (length(piece))
			push(rows, piece);
	}

	return rows;
}

function split_dhcp_lines(value) {
	let rows = [];

	for (let piece in split('' + (value || ''), '\n')) {
		piece = dhcp_clean_value(piece);

		if (length(piece))
			push(rows, piece);
	}

	return rows;
}

function dhcp_normalize_list(value) {
	if (type(value) == 'array')
		return value;

	if (value == null || value == '')
		return [];

	return [value];
}

function dhcp_set_option(section, option, value) {
	if (value == null || value == '')
		uci.delete('dhcp', section, option);
	else
		uci.set('dhcp', section, option, value);
}

function same_dhcp_list(current, next) {
	current = dhcp_normalize_list(current);
	next = dhcp_normalize_list(next);

	if (length(current) != length(next))
		return false;

	for (let i = 0; i < length(current); i++)
		if (current[i] != next[i])
			return false;

	return true;
}

function valid_ipv4(value) {
	return match(value, /^([0-9]{1,3}\.){3}[0-9]{1,3}$/);
}

function valid_mac_list(value) {
	return length(value) && replace(value, /[^A-Fa-f0-9:,\n -]/g, '') == value;
}

function dhcp_zero_one(value) {
	return value == '1' || value == 1 || value == true || value == 'on' ? '1' : '0';
}

function dhcp_optional_zero_one(value) {
	value = '' + (value || '');
	return value == '1' || value == '0' ? value : '';
}

function dhcp_numeric_value(value) {
	return value == '' || replace(value, /[^0-9]/g, '') == value;
}

function valid_dhcp_leasetime(value) {
	return length(value) && replace(value, /[^A-Za-z0-9_-]/g, '') == value;
}

function save_dhcp_static_hosts(rows) {
	rows ||= [];
	uci.load('dhcp');

	let changed = false;
	let config_changed = false;
	let keep = {};
	let existing = {};

	uci.foreach('dhcp', 'host', function(section) {
		existing[section['.name']] = true;
	});

	for (let row in rows) {
		let section = dhcp_clean_value(row?.section || '');
		let is_existing = length(section) && uci.get('dhcp', section) == 'host';

		if (!is_existing) {
			section = uci.add('dhcp', 'host');
			changed = true;
		}

		keep[section] = true;

		let name = dhcp_clean_value(row?.name || '');
		let ip = dhcp_clean_value(row?.ip || '');
		let mac = dhcp_clean_value(row?.mac || '');
		let mac_list = split_dhcp_list(mac);
		let leasetime = dhcp_clean_value(row?.leasetime || '');
		let duid_list = split_dhcp_list(row?.duid || '');
		let hostid = dhcp_clean_value(row?.hostid || '');
		let tag_list = split_dhcp_list(row?.tag || '');
		let match_tag_list = split_dhcp_list(row?.match_tag || '');
		let instance = dhcp_clean_value(row?.instance || '');
		let broadcast = dhcp_optional_zero_one(row?.broadcast);
		let dns = dhcp_optional_zero_one(row?.dns);

		if (ip != '' && ip != 'ignore' && !valid_ipv4(ip))
			return {
				saved: false,
				message: 'Static DHCP host IP must be an IPv4 address, ignore, or blank.',
				changed: false,
				hosts: dhcp_static_hosts(),
				sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
			};

		if ((mac != '' && !valid_mac_list(mac)) || (!length(mac_list) && !length(duid_list) && !length(name)))
			return {
				saved: false,
				message: 'Static DHCP host requires at least one MAC address, DUID/IAID, or hostname.',
				changed: false,
				hosts: dhcp_static_hosts(),
				sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
			};

		if (leasetime != '' && !valid_dhcp_leasetime(leasetime))
			return {
				saved: false,
				message: 'Static DHCP host lease time contains unsupported characters.',
				changed: false,
				hosts: dhcp_static_hosts(),
				sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
			};

		if (hostid != '' && (length(hostid) > 16 || replace(hostid, /[^A-Fa-f0-9]/g, '') != hostid))
			return {
				saved: false,
				message: 'Static DHCP host IPv6 token must be up to 16 hexadecimal characters.',
				changed: false,
				hosts: dhcp_static_hosts(),
				sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
			};

		for (let value in [name, hostid, instance, ...duid_list, ...tag_list, ...match_tag_list]) {
			if (replace(value, /[^A-Za-z0-9_.:%!-]/g, '') != value)
				return {
					saved: false,
					message: 'Static DHCP host DUID, tag, instance, or hostname contains unsupported characters.',
					changed: false,
					hosts: dhcp_static_hosts(),
					sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
				};
		}

		let scalar_options = {
			name,
			ip,
			leasetime,
			hostid,
			instance,
			broadcast,
			dns
		};

		for (let key, value in scalar_options) {
			let current = uci.get('dhcp', section, key) || '';

			if (current != value) {
				changed = true;
				dhcp_set_option(section, key, value);
			}
		}

		let list_options = {
			mac: mac_list,
			duid: duid_list,
			tag: tag_list,
			match_tag: match_tag_list
		};

		for (let key, values in list_options) {
			let current = uci.get('dhcp', section, key) || [];

			if (!same_dhcp_list(current, values)) {
				changed = true;
				if (length(values))
					uci.set('dhcp', section, key, length(values) == 1 ? values[0] : values);
				else
					uci.delete('dhcp', section, key);
			}
		}
	}

	for (let section in existing) {
		if (!keep[section]) {
			uci.delete('dhcp', section);
			changed = true;
		}
	}

	if (changed) {
		uci.commit('dhcp');
		system('/etc/init.d/dnsmasq reload >/dev/null 2>&1 || /etc/init.d/dnsmasq restart >/dev/null 2>&1');
		system('/etc/init.d/odhcpd reload >/dev/null 2>&1 || true');
	}

	return {
		saved: true,
		message: changed ? 'Static DHCP hosts saved and services reloaded.' : 'Static DHCP hosts already up to date.',
		changed,
		hosts: dhcp_static_hosts(),
		sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
	};
}

function valid_domain_record_name(value) {
	return length(value) && replace(value, /[^A-Za-z0-9_.-]/g, '') == value;
}

function valid_dhcp_relay_addr(value) {
	return length(value) && replace(value, /[^A-Fa-f0-9:.#%-]/g, '') == value;
}

function dhcp_relay_family(value) {
	value = split(value || '', '#')[0];
	return index(value, ':') > -1 ? 'ipv6' : 'ipv4';
}

function save_dhcp_relays(rows) {
	rows ||= [];
	uci.load('dhcp');

	let changed = false;
	let keep = {};
	let existing = {};

	uci.foreach('dhcp', 'relay', function(section) {
		existing[section['.name']] = true;
	});

	for (let row in rows) {
		let section = dhcp_clean_value(row?.section || '');
		let is_existing = length(section) && uci.get('dhcp', section) == 'relay';

		if (!is_existing) {
			section = uci.add('dhcp', 'relay');
			changed = true;
		}

		keep[section] = true;

		let local_addr = dhcp_clean_value(row?.local_addr || '');
		let server_addr = dhcp_clean_value(row?.server_addr || '');
		let iface = dhcp_clean_value(row?.interface || '');

		if (!valid_dhcp_relay_addr(local_addr) || !valid_dhcp_relay_addr(server_addr))
			return {
				saved: false,
				message: 'DHCP relay addresses are required and must be valid address values.',
				changed: false,
				relays: dhcp_relay_rows(),
				sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd', 'relay'])
			};

		if (dhcp_relay_family(local_addr) != dhcp_relay_family(server_addr))
			return {
				saved: false,
				message: 'DHCP relay from/to address families must match.',
				changed: false,
				relays: dhcp_relay_rows(),
				sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd', 'relay'])
			};

		if (replace(iface, /[^A-Za-z0-9_.:@-]/g, '') != iface)
			return {
				saved: false,
				message: 'DHCP relay reply interface contains unsupported characters.',
				changed: false,
				relays: dhcp_relay_rows(),
				sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd', 'relay'])
			};

		let next = {
			local_addr,
			server_addr,
			interface: iface
		};

		for (let key, value in next) {
			let current = uci.get('dhcp', section, key) || '';

			if (current != value) {
				changed = true;
				dhcp_set_option(section, key, value);
			}
		}
	}

	for (let section in existing) {
		if (!keep[section]) {
			uci.delete('dhcp', section);
			changed = true;
		}
	}

	if (changed) {
		uci.commit('dhcp');
		system('/etc/init.d/dnsmasq reload >/dev/null 2>&1 || /etc/init.d/dnsmasq restart >/dev/null 2>&1');
		system('/etc/init.d/odhcpd reload >/dev/null 2>&1 || true');
	}

	return {
		saved: true,
		message: changed ? 'DHCP relays saved and services reloaded.' : 'DHCP relays already up to date.',
		changed,
		relays: dhcp_relay_rows(),
		sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd', 'relay'])
	};
}

function valid_dhcp_boot_value(value) {
	return replace(value, /[^A-Za-z0-9_.:@/+%#,\[\]-]/g, '') == value;
}

function save_dhcp_boots(rows) {
	rows ||= [];
	uci.load('dhcp');

	let changed = false;
	let keep = {};
	let existing = {};

	uci.foreach('dhcp', 'boot', function(section) {
		existing[section['.name']] = true;
	});

	for (let row in rows) {
		let section = dhcp_clean_value(row?.section || '');
		let is_existing = length(section) && uci.get('dhcp', section) == 'boot';

		if (!is_existing) {
			section = uci.add('dhcp', 'boot');
			changed = true;
		}

		keep[section] = true;

		let filename = dhcp_clean_value(row?.filename || '');
		let servername = dhcp_clean_value(row?.servername || '');
		let serveraddress = dhcp_clean_value(row?.serveraddress || '');
		let dhcp_option_list = split_dhcp_lines(row?.dhcp_option || '');
		let networkid = dhcp_clean_value(row?.networkid || '');
		let force = dhcp_optional_zero_one(row?.force);
		let instance = dhcp_clean_value(row?.instance || '');

		if (!length(filename) || !length(servername) || !length(serveraddress))
			return {
				saved: false,
				message: 'PXE/TFTP boot filename, server name, and server address are required.',
				changed: false,
				boots: dhcp_boot_rows(),
				sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd', 'relay', 'boot', 'boot6'])
			};

		for (let value in [filename, servername, serveraddress, networkid, instance, ...dhcp_option_list]) {
			if (!valid_dhcp_boot_value(value))
				return {
					saved: false,
					message: 'PXE/TFTP boot option contains unsupported characters.',
					changed: false,
					boots: dhcp_boot_rows(),
					sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd', 'relay', 'boot', 'boot6'])
				};
		}

		let scalar_options = {
			filename,
			servername,
			serveraddress,
			networkid,
			force,
			instance
		};

		for (let key, value in scalar_options) {
			let current = uci.get('dhcp', section, key) || '';

			if (current != value) {
				changed = true;
				dhcp_set_option(section, key, value);
			}
		}

		let current_options = uci.get('dhcp', section, 'dhcp_option') || [];

		if (!same_dhcp_list(current_options, dhcp_option_list)) {
			changed = true;
			if (length(dhcp_option_list))
				uci.set('dhcp', section, 'dhcp_option', length(dhcp_option_list) == 1 ? dhcp_option_list[0] : dhcp_option_list);
			else
				uci.delete('dhcp', section, 'dhcp_option');
		}
	}

	for (let section in existing) {
		if (!keep[section]) {
			uci.delete('dhcp', section);
			changed = true;
		}
	}

	if (changed) {
		uci.commit('dhcp');
		system('/etc/init.d/dnsmasq reload >/dev/null 2>&1 || /etc/init.d/dnsmasq restart >/dev/null 2>&1');
	}

	return {
		saved: true,
		message: changed ? 'PXE/TFTP boot options saved and dnsmasq reloaded.' : 'PXE/TFTP boot options already up to date.',
		changed,
		boots: dhcp_boot_rows(),
		sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd', 'relay', 'boot', 'boot6'])
	};
}

function save_dhcp_boot6s(rows) {
	rows ||= [];
	uci.load('dhcp');

	let changed = false;
	let keep = {};
	let existing = {};

	uci.foreach('dhcp', 'boot6', function(section) {
		existing[section['.name']] = true;
	});

	for (let row in rows) {
		let section = dhcp_clean_value(row?.section || '');
		let is_existing = length(section) && uci.get('dhcp', section) == 'boot6';

		if (!is_existing) {
			section = uci.add('dhcp', 'boot6');
			changed = true;
		}

		keep[section] = true;

		let url = dhcp_clean_value(row?.url || '');
		let arch = dhcp_clean_value(row?.arch || '');

		if (!length(url) || !valid_dhcp_boot_value(url))
			return {
				saved: false,
				message: 'IPv6 PXE boot URL is required and contains unsupported characters.',
				changed: false,
				boots: dhcp_boot6_rows(),
				sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd', 'relay', 'boot', 'boot6'])
			};

		if (arch != '' && (!dhcp_numeric_value(arch) || +arch < 0 || +arch > 65535))
			return {
				saved: false,
				message: 'IPv6 PXE boot architecture must be between 0 and 65535.',
				changed: false,
				boots: dhcp_boot6_rows(),
				sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd', 'relay', 'boot', 'boot6'])
			};

		let next = { url, arch };

		for (let key, value in next) {
			let current = uci.get('dhcp', section, key) || '';

			if (current != value) {
				changed = true;
				dhcp_set_option(section, key, value);
			}
		}
	}

	for (let section in existing) {
		if (!keep[section]) {
			uci.delete('dhcp', section);
			changed = true;
		}
	}

	if (changed) {
		uci.commit('dhcp');
		system('/etc/init.d/odhcpd reload >/dev/null 2>&1 || true');
	}

	return {
		saved: true,
		message: changed ? 'IPv6 PXE boot options saved and odhcpd reloaded.' : 'IPv6 PXE boot options already up to date.',
		changed,
		boots: dhcp_boot6_rows(),
		sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd', 'relay', 'boot', 'boot6'])
	};
}

function dhcp_extended_sections() {
	return collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd', 'relay', 'boot', 'boot6', 'tag', 'match', 'vendorclass', 'userclass']);
}

function valid_dhcp_tag_name(value) {
	return length(value) && replace(value, /[^A-Za-z0-9_.!-]/g, '') == value;
}

function valid_dhcp_tag_value(value) {
	return replace(value, /[^A-Za-z0-9_.:@/+%#,\[\] !-]/g, '') == value;
}

function save_dhcp_tags(rows) {
	rows ||= [];
	uci.load('dhcp');

	let changed = false;
	let keep = {};
	let seen = {};
	let existing = {};

	uci.foreach('dhcp', 'tag', function(section) {
		existing[section['.name']] = true;
	});

	for (let row in rows) {
		let name = dhcp_clean_value(row?.section || '');
		let option_list = split_dhcp_lines(row?.dhcp_option || '');
		let force = dhcp_optional_zero_one(row?.force);

		if (!valid_dhcp_tag_name(name) || seen[name])
			return {
				saved: false,
				message: 'DHCP tag name is required, unique, and may contain letters, numbers, dots, underscores, dashes, or !.',
				changed: false,
				tags: dhcp_tag_rows(),
				sections: dhcp_extended_sections()
			};

		seen[name] = true;

		for (let value in option_list) {
			if (!valid_dhcp_tag_value(value))
				return {
					saved: false,
					message: 'DHCP tag option contains unsupported characters.',
					changed: false,
					tags: dhcp_tag_rows(),
					sections: dhcp_extended_sections()
				};
		}

		let section = name;
		let is_existing = length(section) && uci.get('dhcp', section) == 'tag';

		if (!is_existing) {
			section = uci.add('dhcp', 'tag');
			uci.rename('dhcp', section, name);
			section = name;
			changed = true;
		}

		keep[section] = true;

		let current_options = uci.get('dhcp', section, 'dhcp_option') || [];

		if (!same_dhcp_list(current_options, option_list)) {
			changed = true;
			if (length(option_list))
				uci.set('dhcp', section, 'dhcp_option', length(option_list) == 1 ? option_list[0] : option_list);
			else
				uci.delete('dhcp', section, 'dhcp_option');
		}

		let current_force = uci.get('dhcp', section, 'force') || '';

		if (current_force != force) {
			changed = true;
			dhcp_set_option(section, 'force', force);
		}
	}

	for (let section in existing) {
		if (!keep[section]) {
			uci.delete('dhcp', section);
			changed = true;
		}
	}

	if (changed) {
		uci.commit('dhcp');
		system('/etc/init.d/dnsmasq reload >/dev/null 2>&1 || /etc/init.d/dnsmasq restart >/dev/null 2>&1');
	}

	return {
		saved: true,
		message: changed ? 'DHCP tags saved and dnsmasq reloaded.' : 'DHCP tags already up to date.',
		changed,
		tags: dhcp_tag_rows(),
		sections: dhcp_extended_sections()
	};
}

function save_dhcp_condition_rows(section_type, label_key, rows) {
	rows ||= [];
	uci.load('dhcp');

	let changed = false;
	let keep = {};
	let existing = {};

	uci.foreach('dhcp', section_type, function(section) {
		existing[section['.name']] = true;
	});

	for (let row in rows) {
		let section = dhcp_clean_value(row?.section || '');
		let is_existing = length(section) && uci.get('dhcp', section) == section_type;

		if (!is_existing) {
			section = uci.add('dhcp', section_type);
			changed = true;
		}

		keep[section] = true;

		let label = dhcp_clean_value(row?.[label_key] || '');
		let networkid = dhcp_clean_value(row?.networkid || '');
		let force = dhcp_optional_zero_one(row?.force);

		if (!length(label) || !valid_dhcp_tag_name(networkid) || !valid_dhcp_tag_value(label))
			return {
				saved: false,
				message: 'DHCP match/class value and tag are required and contain unsupported characters.',
				changed: false,
				rows: [],
				sections: dhcp_extended_sections()
			};

		let next = {};
		next[label_key] = label;
		next.networkid = networkid;
		next.force = force;

		for (let key, value in next) {
			let current = uci.get('dhcp', section, key) || '';

			if (current != value) {
				changed = true;
				dhcp_set_option(section, key, value);
			}
		}
	}

	for (let section in existing) {
		if (!keep[section]) {
			uci.delete('dhcp', section);
			changed = true;
		}
	}

	if (changed) {
		uci.commit('dhcp');
		system('/etc/init.d/dnsmasq reload >/dev/null 2>&1 || /etc/init.d/dnsmasq restart >/dev/null 2>&1');
	}

	return changed;
}

function save_dhcp_matches(rows) {
	let changed = save_dhcp_condition_rows('match', 'match', rows);

	if (type(changed) == 'object')
		return {
			saved: false,
			message: changed.message,
			changed: false,
			matches: dhcp_match_rows(),
			sections: dhcp_extended_sections()
		};

	return {
		saved: true,
		message: changed ? 'DHCP option matches saved and dnsmasq reloaded.' : 'DHCP option matches already up to date.',
		changed,
		matches: dhcp_match_rows(),
		sections: dhcp_extended_sections()
	};
}

function save_dhcp_vendorclasses(rows) {
	let changed = save_dhcp_condition_rows('vendorclass', 'vendorclass', rows);

	if (type(changed) == 'object')
		return {
			saved: false,
			message: changed.message,
			changed: false,
			classes: dhcp_vendorclass_rows(),
			sections: dhcp_extended_sections()
		};

	return {
		saved: true,
		message: changed ? 'DHCP vendor class matches saved and dnsmasq reloaded.' : 'DHCP vendor class matches already up to date.',
		changed,
		classes: dhcp_vendorclass_rows(),
		sections: dhcp_extended_sections()
	};
}

function save_dhcp_userclasses(rows) {
	let changed = save_dhcp_condition_rows('userclass', 'userclass', rows);

	if (type(changed) == 'object')
		return {
			saved: false,
			message: changed.message,
			changed: false,
			classes: dhcp_userclass_rows(),
			sections: dhcp_extended_sections()
		};

	return {
		saved: true,
		message: changed ? 'DHCP user class matches saved and dnsmasq reloaded.' : 'DHCP user class matches already up to date.',
		changed,
		classes: dhcp_userclass_rows(),
		sections: dhcp_extended_sections()
	};
}

function save_dhcp_domain_records(rows) {
	rows ||= [];
	uci.load('dhcp');

	let changed = false;
	let keep = {};
	let existing = {};

	uci.foreach('dhcp', 'domain', function(section) {
		existing[section['.name']] = true;
	});

	for (let row in rows) {
		let section = dhcp_clean_value(row?.section || '');
		let is_existing = length(section) && uci.get('dhcp', section) == 'domain';

		if (!is_existing) {
			section = uci.add('dhcp', 'domain');
			changed = true;
		}

		keep[section] = true;

		let name = dhcp_clean_value(row?.name || '');
		let ip = dhcp_clean_value(row?.ip || '');

		if (!valid_domain_record_name(name))
			return {
				saved: false,
				message: 'DNS host record name must contain only letters, numbers, dots, dashes, and underscores.',
				changed: false,
				domains: dhcp_domain_records(),
				sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
			};

		if (!valid_ipv4(ip))
			return {
				saved: false,
				message: 'DNS host record IP must be an IPv4 address.',
				changed: false,
				domains: dhcp_domain_records(),
				sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
			};

		let current_name = uci.get('dhcp', section, 'name') || '';
		let current_ip = uci.get('dhcp', section, 'ip') || '';

		if (current_name != name) {
			changed = true;
			uci.set('dhcp', section, 'name', name);
		}

		if (current_ip != ip) {
			changed = true;
			uci.set('dhcp', section, 'ip', ip);
		}
	}

	for (let section in existing) {
		if (!keep[section]) {
			uci.delete('dhcp', section);
			changed = true;
		}
	}

	if (changed) {
		uci.commit('dhcp');
		system('/etc/init.d/dnsmasq reload >/dev/null 2>&1 || /etc/init.d/dnsmasq restart >/dev/null 2>&1');
	}

	return {
		saved: true,
		message: changed ? 'DNS host records saved and dnsmasq reloaded.' : 'DNS host records already up to date.',
		changed,
		domains: dhcp_domain_records(),
		sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
	};
}

function dhcp_pool_rows() {
	let pools = [];

	try {
		uci.load('dhcp');
	}
	catch (e) {
		return pools;
	}

	uci.foreach('dhcp', 'dhcp', function(section) {
		push(pools, {
			section: section['.name'] || '',
			interface: section.interface || section['.name'] || '',
			ignore: section.ignore || '0',
			start: section.start || '',
			limit: section.limit || '',
			leasetime: section.leasetime || '',
			dhcpv4: section.dhcpv4 || '',
			dhcpv6: section.dhcpv6 || '',
			ra: section.ra || ''
		});
	});

	return pools;
}

function valid_dhcp_mode(value) {
	return value == '' || value == 'server' || value == 'relay' || value == 'hybrid' || value == 'disabled';
}

function save_dhcp_pools(rows) {
	rows ||= [];
	uci.load('dhcp');

	let changed = false;
	let keep = {};
	let existing = {};

	uci.foreach('dhcp', 'dhcp', function(section) {
		existing[section['.name']] = true;
	});

	for (let row in rows) {
		let section = dhcp_clean_value(row?.section || '');
		let is_existing = length(section) && uci.get('dhcp', section) == 'dhcp';

		if (!is_existing) {
			section = uci.add('dhcp', 'dhcp');
			changed = true;
		}

		keep[section] = true;

		let iface = dhcp_clean_value(row?.interface || section);
		let ignore = dhcp_zero_one(row?.ignore);
		let start = dhcp_clean_value(row?.start || '');
		let limit = dhcp_clean_value(row?.limit || '');
		let leasetime = dhcp_clean_value(row?.leasetime || '');
		let dhcpv4 = dhcp_clean_value(row?.dhcpv4 || '');
		let dhcpv6 = dhcp_clean_value(row?.dhcpv6 || '');
		let ra = dhcp_clean_value(row?.ra || '');

		if (!length(iface))
			return {
				saved: false,
				message: 'DHCP pool interface is required.',
				changed: false,
				pools: dhcp_pool_rows(),
				sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
			};

		if ((start != '' && !dhcp_numeric_value(start)) || (limit != '' && !dhcp_numeric_value(limit)))
			return {
				saved: false,
				message: 'DHCP pool start and limit must be numeric.',
				changed: false,
				pools: dhcp_pool_rows(),
				sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
			};

		if (leasetime != '' && !valid_dhcp_leasetime(leasetime))
			return {
				saved: false,
				message: 'DHCP lease time contains unsupported characters.',
				changed: false,
				pools: dhcp_pool_rows(),
				sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
			};

		if (!valid_dhcp_mode(dhcpv4) || !valid_dhcp_mode(dhcpv6) || !valid_dhcp_mode(ra))
			return {
				saved: false,
				message: 'DHCP mode must be server, relay, hybrid, disabled, or blank.',
				changed: false,
				pools: dhcp_pool_rows(),
				sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
			};

		let next = {
			interface: iface,
			ignore,
			start,
			limit,
			leasetime,
			dhcpv4,
			dhcpv6,
			ra
		};

		for (let key, value in next) {
			let current = uci.get('dhcp', section, key) || '';

			if (key == 'ignore' && value == '0' && current == '')
				continue;

			if (current != value) {
				changed = true;
				if (key == 'ignore' && value == '0')
					uci.delete('dhcp', section, key);
				else
					dhcp_set_option(section, key, value);
			}
		}
	}

	for (let section in existing) {
		if (!keep[section]) {
			uci.delete('dhcp', section);
			changed = true;
		}
	}

	if (changed) {
		uci.commit('dhcp');
		system('/etc/init.d/dnsmasq reload >/dev/null 2>&1 || /etc/init.d/dnsmasq restart >/dev/null 2>&1');
		system('/etc/init.d/odhcpd reload >/dev/null 2>&1 || true');
	}

	return {
		saved: true,
		message: changed ? 'DHCP pools saved and services reloaded.' : 'DHCP pools already up to date.',
		changed,
		pools: dhcp_pool_rows(),
		sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
	};
}

function first_dhcp_section(section_type) {
	let section = null;

	uci.load('dhcp');
	uci.foreach('dhcp', section_type, function(s) {
		section ??= s['.name'];
	});

	return section;
}

function dnsmasq_section() {
	let section = first_dhcp_section('dnsmasq');

	return section || uci.add('dhcp', 'dnsmasq');
}

function odhcpd_section() {
	let section = first_dhcp_section('odhcpd');

	return section || uci.add('dhcp', 'odhcpd');
}

function save_dnsmasq_config(config) {
	config ||= {};
	uci.load('dhcp');

	let section = dnsmasq_section();
	let server_list = split_dhcp_list(config.server || '');
	let address_list = split_dhcp_list(config.address || '');
	let rebind_domain_list = split_dhcp_list(config.rebind_domain || '');
	let bogusnxdomain_list = split_dhcp_list(config.bogusnxdomain || '');
	let addnhosts_list = split_dhcp_list(config.addnhosts || '');
	let interface_list = split_dhcp_list(config.interface || '');
	let listen_address_list = split_dhcp_list(config.listen_address || '');
	let notinterface_list = split_dhcp_list(config.notinterface || '');
	let next = {
		domainneeded: dhcp_zero_one(config.domainneeded),
		localise_queries: dhcp_zero_one(config.localise_queries),
		rebind_protection: dhcp_zero_one(config.rebind_protection),
		rebind_localhost: dhcp_zero_one(config.rebind_localhost),
		expandhosts: dhcp_zero_one(config.expandhosts),
		readethers: dhcp_zero_one(config.readethers),
		localservice: dhcp_zero_one(config.localservice),
		authoritative: dhcp_zero_one(config.authoritative),
		sequential_ip: dhcp_zero_one(config.sequential_ip),
		address_as_local: dhcp_optional_zero_one(config.address_as_local),
		nonwildcard: dhcp_optional_zero_one(config.nonwildcard),
		logdhcp: dhcp_optional_zero_one(config.logdhcp),
		quietdhcp: dhcp_optional_zero_one(config.quietdhcp),
		enable_tftp: dhcp_optional_zero_one(config.enable_tftp),
		allservers: dhcp_optional_zero_one(config.allservers),
		boguspriv: dhcp_optional_zero_one(config.boguspriv),
		filterwin2k: dhcp_optional_zero_one(config.filterwin2k),
		filter_aaaa: dhcp_optional_zero_one(config.filter_aaaa),
		filter_a: dhcp_optional_zero_one(config.filter_a),
		nonegcache: dhcp_optional_zero_one(config.nonegcache),
		noresolv: dhcp_optional_zero_one(config.noresolv),
		strictorder: dhcp_optional_zero_one(config.strictorder),
		ignore_hosts_dir: dhcp_optional_zero_one(config.ignore_hosts_dir),
		nohosts: dhcp_optional_zero_one(config.nohosts),
		logqueries: dhcp_optional_zero_one(config.logqueries),
		stripmac: dhcp_optional_zero_one(config.stripmac),
		stripsubnet: dhcp_optional_zero_one(config.stripsubnet),
		local: dhcp_clean_value(config.local || ''),
		domain: dhcp_clean_value(config.domain || ''),
		cachesize: dhcp_clean_value(config.cachesize || ''),
		dhcpleasemax: dhcp_clean_value(config.dhcpleasemax || ''),
		dnsforwardmax: dhcp_clean_value(config.dnsforwardmax || ''),
		min_cache_ttl: dhcp_clean_value(config.min_cache_ttl || ''),
		max_cache_ttl: dhcp_clean_value(config.max_cache_ttl || ''),
		ednspacket_max: dhcp_clean_value(config.ednspacket_max || ''),
		port: dhcp_clean_value(config.port || ''),
		queryport: dhcp_clean_value(config.queryport || ''),
		minport: dhcp_clean_value(config.minport || ''),
		maxport: dhcp_clean_value(config.maxport || ''),
		leasefile: dhcp_clean_value(config.leasefile || ''),
		resolvfile: dhcp_clean_value(config.resolvfile || ''),
		serversfile: dhcp_clean_value(config.serversfile || ''),
		logfacility: dhcp_clean_value(config.logfacility || ''),
		addmac: dhcp_clean_value(config.addmac || ''),
		addsubnet: dhcp_clean_value(config.addsubnet || ''),
		tftp_root: dhcp_clean_value(config.tftp_root || ''),
		dhcp_boot: dhcp_clean_value(config.dhcp_boot || '')
	};

	for (let value in [next.cachesize, next.dhcpleasemax, next.dnsforwardmax, next.min_cache_ttl, next.max_cache_ttl, next.ednspacket_max, next.port, next.queryport, next.minport, next.maxport]) {
		if (!dhcp_numeric_value(value))
			return {
				saved: false,
				message: 'DNS cache, TTL, query, lease, and port limits must be numeric.',
				changed: false,
				section: (collect_uci_config('dhcp', ['dnsmasq']) || [])[0] || null,
				sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
			};
	}

	if (next.port != '' && (+next.port < 0 || +next.port > 65535))
		return {
			saved: false,
			message: 'DNS server port must be between 0 and 65535.',
			changed: false,
			section: (collect_uci_config('dhcp', ['dnsmasq']) || [])[0] || null,
			sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
		};

	for (let value in [next.logfacility, next.tftp_root, next.dhcp_boot, next.addmac, next.addsubnet, ...address_list, ...rebind_domain_list, ...bogusnxdomain_list, ...addnhosts_list, ...interface_list, ...listen_address_list, ...notinterface_list]) {
		if (replace(value, /[^A-Za-z0-9_.:@/+%#-]/g, '') != value)
			return {
				saved: false,
				message: 'DNS filter, forward, address, listen, logging, hosts, or PXE/TFTP settings contain unsupported characters.',
				changed: false,
				section: (collect_uci_config('dhcp', ['dnsmasq']) || [])[0] || null,
				sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
			};
	}

	let changed = false;

	for (let key, value in next) {
		let current = uci.get('dhcp', section, key) || '';

		if (current != value) {
			changed = true;
			dhcp_set_option(section, key, value);
		}
	}

	let current_servers = uci.get('dhcp', section, 'server') || [];

	if (!same_dhcp_list(current_servers, server_list)) {
		changed = true;
		if (length(server_list))
			uci.set('dhcp', section, 'server', server_list);
		else
			uci.delete('dhcp', section, 'server');
	}

	let list_options = {
		address: address_list,
		rebind_domain: rebind_domain_list,
		bogusnxdomain: bogusnxdomain_list,
		addnhosts: addnhosts_list,
		interface: interface_list,
		listen_address: listen_address_list,
		notinterface: notinterface_list
	};

	for (let key, values in list_options) {
		let current = uci.get('dhcp', section, key) || [];

		if (!same_dhcp_list(current, values)) {
			changed = true;
			if (length(values))
				uci.set('dhcp', section, key, length(values) == 1 ? values[0] : values);
			else
				uci.delete('dhcp', section, key);
		}
	}

	if (changed) {
		uci.commit('dhcp');
		system('/etc/init.d/dnsmasq reload >/dev/null 2>&1 || /etc/init.d/dnsmasq restart >/dev/null 2>&1');
	}

	return {
		saved: true,
		message: changed ? 'DNS settings saved and dnsmasq reloaded.' : 'DNS settings already up to date.',
		changed,
		section: (collect_uci_config('dhcp', ['dnsmasq']) || [])[0] || null,
		sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
	};
}

function save_odhcpd_config(config) {
	config ||= {};
	uci.load('dhcp');

	let section = odhcpd_section();
	let next = {
		maindhcp: dhcp_zero_one(config.maindhcp),
		leasefile: dhcp_clean_value(config.leasefile || ''),
		leasetrigger: dhcp_clean_value(config.leasetrigger || ''),
		hostsdir: dhcp_clean_value(config.hostsdir || ''),
		piodir: dhcp_clean_value(config.piodir || ''),
		loglevel: dhcp_clean_value(config.loglevel || '')
	};

	if (!dhcp_numeric_value(next.loglevel) || (next.loglevel != '' && (+next.loglevel < 0 || +next.loglevel > 7)))
		return {
			saved: false,
			message: 'odhcpd log level must be between 0 and 7.',
			changed: false,
			section: (collect_uci_config('dhcp', ['odhcpd']) || [])[0] || null,
			sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
		};

	for (let value in [next.leasefile, next.leasetrigger, next.hostsdir, next.piodir]) {
		if (replace(value, /[^A-Za-z0-9_.:@/+%-]/g, '') != value)
			return {
				saved: false,
				message: 'odhcpd path settings contain unsupported characters.',
				changed: false,
				section: (collect_uci_config('dhcp', ['odhcpd']) || [])[0] || null,
				sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
			};
	}

	let changed = false;

	for (let key, value in next) {
		let current = uci.get('dhcp', section, key) || '';

		if (current != value) {
			changed = true;
			dhcp_set_option(section, key, value);
		}
	}

	if (changed) {
		uci.commit('dhcp');
		system('/etc/init.d/odhcpd reload >/dev/null 2>&1 || /etc/init.d/odhcpd restart >/dev/null 2>&1 || true');
	}

	return {
		saved: true,
		message: changed ? 'odhcpd settings saved and service reloaded.' : 'odhcpd settings already up to date.',
		changed,
		section: (collect_uci_config('dhcp', ['odhcpd']) || [])[0] || null,
		sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
	};
}

function network_route_rows() {
	let routes = [];

	try {
		uci.load('network');
	}
	catch (e) {
		return routes;
	}

	for (let section_type in ['route', 'route6']) {
		uci.foreach('network', section_type, function(section) {
			push(routes, {
				section: section['.name'] || '',
				family: section_type,
				interface: section.interface || '',
				type: section.type || '',
				target: section.target || '',
				netmask: section.netmask || '',
				gateway: section.gateway || '',
				metric: section.metric || '',
				table: section.table || '',
				source: section.source || '',
				mtu: section.mtu || '',
				onlink: section.onlink || '',
				disabled: section.disabled || ''
			});
		});
	}

	return routes;
}

function valid_network_route_text(value) {
	return value == '' || replace(value, /[^A-Za-z0-9:._/%-]/g, '') == value;
}

function valid_network_route_list(values) {
	for (let value in values)
		if (!valid_network_route_text(value))
			return false;

	return true;
}

function valid_network_route_interface(value) {
	return length(value) && replace(value, /[^A-Za-z0-9_.:-]/g, '') == value;
}

function valid_network_interface_text(value) {
	return value == '' || replace(value, /[^A-Za-z0-9:._/%@*+ -]/g, '') == value;
}

function network_interface_rows() {
	let interfaces = [];
	let interface_zones = {};

	try {
		uci.load('network');
		uci.load('firewall');
	}
	catch (e) {
		return interfaces;
	}

	uci.foreach('firewall', 'zone', function(section) {
		let name = section.name || section['.name'] || '';

		for (let network in dhcp_normalize_list(section.network))
			if (length(network) && !interface_zones[network])
				interface_zones[network] = name;
	});

	uci.foreach('network', 'interface', function(section) {
		push(interfaces, {
			section: section['.name'] || '',
			zone: interface_zones[section['.name'] || ''] || '',
			proto: section.proto || '',
			device: section.device || section.ifname || '',
			disabled: section.disabled || '',
			auto: section.auto || '',
			force_link: section.force_link || '',
			defaultroute: section.defaultroute || '',
			ipaddr: join('\n', dhcp_normalize_list(section.ipaddr)),
			netmask: section.netmask || '',
			gateway: section.gateway || '',
			broadcast: section.broadcast || '',
			ip6assign: section.ip6assign || '',
			ip6hint: section.ip6hint || '',
			ip6ifaceid: section.ip6ifaceid || '',
			ip6class: join('\n', dhcp_normalize_list(section.ip6class)),
			ip6prefix: join('\n', dhcp_normalize_list(section.ip6prefix)),
			dns: join('\n', dhcp_normalize_list(section.dns)),
			dns_metric: section.dns_metric || '',
			metric: section.metric || '',
			peerdns: section.peerdns == '0' ? '0' : '1',
			delegate: section.delegate == '0' ? '0' : '1',
			hostname: section.hostname || '',
			clientid: section.clientid || '',
			vendorid: section.vendorid || '',
			norelease: section.norelease || ''
		});
	});

	return interfaces;
}

function network_interface_action(name, action) {
	name = dhcp_clean_value(name || '');
	action = trim('' + (action || 'status'));

	if (!valid_network_route_interface(name))
		return {
			ok: false,
			name,
			action,
			message: 'Network interface name is invalid.',
			state: null
		};

	if (action != 'status')
		return {
			ok: false,
			name,
			action,
			message: 'Native interface start, restart, and stop actions are disabled on this router because it carries live internet traffic.',
			state: null
		};

	let state = null;
	try {
		state = ubus.call('network.interface.' + name, 'status') || null;
	}
	catch (e) {
		state = null;
	}

	return {
		ok: state != null,
		name,
		action,
		message: state != null ? 'Interface status loaded.' : 'Interface is unavailable.',
		state
	};
}

function update_firewall_zone_networks(interface_name, target_zone) {
	let changed = false;

	uci.foreach('firewall', 'zone', function(section) {
		let section_name = section['.name'];
		let zone_name = section.name || section_name || '';
		let next_networks = [];
		let found = false;

		for (let network in dhcp_normalize_list(section.network)) {
			if (network == interface_name) {
				found = true;
				if (zone_name != target_zone)
					changed = true;
				else
					push(next_networks, network);
			}
			else {
				push(next_networks, network);
			}
		}

		if (zone_name == target_zone && length(target_zone) && !found) {
			push(next_networks, interface_name);
			changed = true;
		}

		if (!same_dhcp_list(section.network || [], next_networks)) {
			if (length(next_networks))
				uci.set('firewall', section_name, 'network', length(next_networks) == 1 ? next_networks[0] : next_networks);
			else
				uci.delete('firewall', section_name, 'network');
		}
	});

	return changed;
}

function save_network_interfaces(rows) {
	rows ||= [];
	uci.load('network');
	uci.load('firewall');

	let changed = false;
	let firewall_changed = false;
	let validated = [];
	let seen = {};
	let zone_sections = {};

	uci.foreach('firewall', 'zone', function(section) {
		let name = section.name || section['.name'] || '';

		if (length(name))
			zone_sections[name] = section['.name'];
	});

	for (let row in rows) {
		let section = dhcp_clean_value(row?.section || '');
		let exists = length(section) && uci.get('network', section) == 'interface';
		let remove = dhcp_zero_one(row?.remove) == '1';
		let zone_provided = row != null && row.zone != null;
		let zone = zone_provided ? dhcp_clean_value(row?.zone || '') : null;
		let zone_create = zone == '__custom';
		let zone_name = zone_create ? dhcp_clean_value(row?.zoneName || '') : zone;

		if (!length(section) || !valid_network_route_interface(section))
			return {
				saved: false,
				message: 'Network interface name is required and must contain only supported characters.',
				changed: false,
				interfaces: network_interface_rows(),
				sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
			};

		if (seen[section])
			return {
				saved: false,
				message: 'Network interface names must be unique.',
				changed: false,
				interfaces: network_interface_rows(),
				sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
			};

		seen[section] = true;

		if (remove) {
			if (section == 'loopback')
				return {
					saved: false,
					message: 'Loopback interface cannot be removed.',
					changed: false,
					interfaces: network_interface_rows(),
					sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
				};

			if (exists)
				push(validated, {
					section,
					remove: true,
					zone_provided: true,
					zone: ''
				});

			continue;
		}

		if (zone_provided) {
			if (zone_name != '' && !valid_network_route_interface(zone_name))
				return {
					saved: false,
					message: 'Network interface firewall zone contains unsupported characters.',
					changed: false,
					interfaces: network_interface_rows(),
					sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6']),
					firewallSections: collect_uci_config('firewall', ['zone'])
				};

			if (zone_create && !length(zone_name))
				return {
					saved: false,
					message: 'New firewall zone name is required.',
					changed: false,
					interfaces: network_interface_rows(),
					sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6']),
					firewallSections: collect_uci_config('firewall', ['zone'])
				};

			if (zone_create && zone_sections[zone_name])
				return {
					saved: false,
					message: 'New firewall zone already exists.',
					changed: false,
					interfaces: network_interface_rows(),
					sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6']),
					firewallSections: collect_uci_config('firewall', ['zone'])
				};

			if (!zone_create && zone_name != '' && !zone_sections[zone_name])
				return {
					saved: false,
					message: 'Network interface firewall zone was not found.',
					changed: false,
					interfaces: network_interface_rows(),
					sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6']),
					firewallSections: collect_uci_config('firewall', ['zone'])
				};
		}

		if (!exists && uci.get('network', section) != null)
			return {
				saved: false,
				message: 'Network interface name is already used by another network section.',
				changed: false,
				interfaces: network_interface_rows(),
				sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
			};

		let ipaddr = split_dhcp_list(row?.ipaddr || '');
		let dns = split_dhcp_list(row?.dns || '');
		let ip6class = split_dhcp_list(row?.ip6class || '');
		let ip6prefix = split_dhcp_list(row?.ip6prefix || '');
		let next = {
			proto: dhcp_clean_value(row?.proto || ''),
			device: dhcp_clean_value(row?.device || ''),
			disabled: dhcp_optional_zero_one(row?.disabled),
			auto: dhcp_optional_zero_one(row?.auto),
			force_link: dhcp_optional_zero_one(row?.force_link),
			defaultroute: dhcp_optional_zero_one(row?.defaultroute),
			netmask: dhcp_clean_value(row?.netmask || ''),
			gateway: dhcp_clean_value(row?.gateway || ''),
			broadcast: dhcp_clean_value(row?.broadcast || ''),
			ip6assign: dhcp_clean_value(row?.ip6assign || ''),
			ip6hint: dhcp_clean_value(row?.ip6hint || ''),
			ip6ifaceid: dhcp_clean_value(row?.ip6ifaceid || ''),
			dns_metric: dhcp_clean_value(row?.dns_metric || ''),
			metric: dhcp_clean_value(row?.metric || ''),
			peerdns: dhcp_zero_one(row?.peerdns),
			delegate: dhcp_zero_one(row?.delegate),
			hostname: dhcp_clean_value(row?.hostname || ''),
			clientid: dhcp_clean_value(row?.clientid || ''),
			vendorid: dhcp_clean_value(row?.vendorid || ''),
			norelease: dhcp_optional_zero_one(row?.norelease)
		};

		if (!valid_network_route_interface(next.proto))
			return {
				saved: false,
				message: 'Network interface protocol is required.',
				changed: false,
				interfaces: network_interface_rows(),
				sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
			};

		if (next.device != '' && !valid_network_route_interface(next.device))
			return {
				saved: false,
				message: 'Network interface device contains unsupported characters.',
				changed: false,
				interfaces: network_interface_rows(),
				sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
			};

		for (let key, value in next) {
			if ((key == 'ip6assign' || key == 'dns_metric' || key == 'metric') && value != '' && !dhcp_numeric_value(value))
				return {
					saved: false,
					message: 'Network interface IPv6 assignment, DNS weight, and gateway metric must be numeric.',
					changed: false,
					interfaces: network_interface_rows(),
					sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
				};

			if ((key == 'netmask' || key == 'gateway' || key == 'broadcast' || key == 'ip6hint' || key == 'ip6ifaceid') && !valid_network_route_text(value))
				return {
					saved: false,
					message: 'Network interface address fields contain unsupported characters.',
					changed: false,
					interfaces: network_interface_rows(),
					sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
				};

			if ((key == 'hostname' || key == 'clientid' || key == 'vendorid') && !valid_network_interface_text(value))
				return {
					saved: false,
					message: 'Network interface DHCP client fields contain unsupported characters.',
					changed: false,
					interfaces: network_interface_rows(),
					sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
				};
		}

		if (!valid_network_route_list(ipaddr) || !valid_network_route_list(dns) || !valid_network_route_list(ip6class) || !valid_network_route_list(ip6prefix))
			return {
				saved: false,
				message: 'Network interface IP address, DNS, or IPv6 prefix fields contain unsupported characters.',
				changed: false,
				interfaces: network_interface_rows(),
				sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
			};

		push(validated, {
			section,
			create: !exists,
			zone_provided,
			zone: zone_name,
			zone_create,
			ipaddr,
			dns,
			ip6class,
			ip6prefix,
			next
		});
	}

	for (let item in validated) {
		let section = item.section;

		if (item.remove) {
			changed = true;
			uci.delete('network', section);
			if (update_firewall_zone_networks(section, ''))
				firewall_changed = true;
			continue;
		}

		let next = item.next;

		if (item.create) {
			changed = true;
			uci.set('network', section, 'interface');
		}

		if (item.zone_create) {
			let zone_section = item.zone;
			firewall_changed = true;
			uci.set('firewall', zone_section, 'zone');
			uci.set('firewall', zone_section, 'name', item.zone);
			uci.set('firewall', zone_section, 'input', 'REJECT');
			uci.set('firewall', zone_section, 'output', 'ACCEPT');
			uci.set('firewall', zone_section, 'forward', 'REJECT');
			zone_sections[item.zone] = zone_section;
		}

		for (let key, value in next) {
			let current = uci.get('network', section, key) || '';

			if ((key == 'peerdns' || key == 'delegate') && value == '1' && current == '')
				continue;

			if (current != value) {
				changed = true;
				if (((key == 'peerdns' || key == 'delegate') && value == '1') || value == '')
					uci.delete('network', section, key);
				else
					uci.set('network', section, key, value);
			}
		}

		if (!same_dhcp_list(uci.get('network', section, 'ipaddr') || [], item.ipaddr)) {
			changed = true;
			if (length(item.ipaddr))
				uci.set('network', section, 'ipaddr', length(item.ipaddr) == 1 ? item.ipaddr[0] : item.ipaddr);
			else
				uci.delete('network', section, 'ipaddr');
		}

		if (!same_dhcp_list(uci.get('network', section, 'dns') || [], item.dns)) {
			changed = true;
			if (length(item.dns))
				uci.set('network', section, 'dns', length(item.dns) == 1 ? item.dns[0] : item.dns);
			else
				uci.delete('network', section, 'dns');
		}

		if (!same_dhcp_list(uci.get('network', section, 'ip6class') || [], item.ip6class)) {
			changed = true;
			if (length(item.ip6class))
				uci.set('network', section, 'ip6class', length(item.ip6class) == 1 ? item.ip6class[0] : item.ip6class);
			else
				uci.delete('network', section, 'ip6class');
		}

		if (!same_dhcp_list(uci.get('network', section, 'ip6prefix') || [], item.ip6prefix)) {
			changed = true;
			if (length(item.ip6prefix))
				uci.set('network', section, 'ip6prefix', length(item.ip6prefix) == 1 ? item.ip6prefix[0] : item.ip6prefix);
			else
				uci.delete('network', section, 'ip6prefix');
		}

		if (item.zone_provided && update_firewall_zone_networks(section, item.zone || ''))
			firewall_changed = true;
	}

	if (changed) {
		uci.commit('network');
		system('/etc/init.d/network reload >/dev/null 2>&1 || true');
	}

	if (firewall_changed) {
		uci.commit('firewall');
		system('/etc/init.d/firewall reload >/dev/null 2>&1 || /etc/init.d/firewall restart >/dev/null 2>&1 || true');
	}

	return {
		saved: true,
		message: changed || firewall_changed ? 'Network interfaces saved and services reloaded.' : 'Network interfaces already up to date.',
		changed: changed || firewall_changed,
		interfaces: network_interface_rows(),
		sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6']),
		firewallSections: collect_uci_config('firewall', ['zone'])
	};
}

function network_device_rows() {
	let devices = [];

	try {
		uci.load('network');
	}
	catch (e) {
		return devices;
	}

	uci.foreach('network', 'device', function(section) {
		push(devices, {
			section: section['.name'] || '',
			name: section.name || '',
			type: section.type || '',
			ports: join('\n', dhcp_normalize_list(section.ports)),
			macaddr: section.macaddr || '',
			mtu: section.mtu || ''
		});
	});

	return devices;
}

function save_network_devices(rows) {
	rows ||= [];
	uci.load('network');

	let changed = false;
	let validated = [];

	for (let row in rows) {
		let section = dhcp_clean_value(row?.section || '');

		if (!length(section) || uci.get('network', section) != 'device')
			return {
				saved: false,
				message: 'Network device section was not found.',
				changed: false,
				devices: network_device_rows(),
				sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
			};

		let ports = split_dhcp_list(row?.ports || '');
		let next = {
			name: dhcp_clean_value(row?.name || ''),
			type: dhcp_clean_value(row?.type || ''),
			macaddr: dhcp_clean_value(row?.macaddr || ''),
			mtu: dhcp_clean_value(row?.mtu || '')
		};

		if (!valid_network_route_interface(next.name))
			return {
				saved: false,
				message: 'Network device name is required.',
				changed: false,
				devices: network_device_rows(),
				sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
			};

		if (next.type != '' && !valid_network_route_interface(next.type))
			return {
				saved: false,
				message: 'Network device type contains unsupported characters.',
				changed: false,
				devices: network_device_rows(),
				sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
			};

		if (next.macaddr != '' && !valid_network_route_text(next.macaddr))
			return {
				saved: false,
				message: 'Network device MAC address contains unsupported characters.',
				changed: false,
				devices: network_device_rows(),
				sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
			};

		if (next.mtu != '' && !dhcp_numeric_value(next.mtu))
			return {
				saved: false,
				message: 'Network device MTU must be numeric.',
				changed: false,
				devices: network_device_rows(),
				sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
			};

		if (!valid_network_route_list(ports))
			return {
				saved: false,
				message: 'Network device ports contain unsupported characters.',
				changed: false,
				devices: network_device_rows(),
				sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
			};

		push(validated, {
			section,
			ports,
			next
		});
	}

	for (let item in validated) {
		let section = item.section;
		let next = item.next;

		for (let key, value in next) {
			let current = uci.get('network', section, key) || '';

			if (current != value) {
				changed = true;
				if (value == '')
					uci.delete('network', section, key);
				else
					uci.set('network', section, key, value);
			}
		}

		if (!same_dhcp_list(uci.get('network', section, 'ports') || [], item.ports)) {
			changed = true;
			if (length(item.ports))
				uci.set('network', section, 'ports', length(item.ports) == 1 ? item.ports[0] : item.ports);
			else
				uci.delete('network', section, 'ports');
		}
	}

	if (changed) {
		uci.commit('network');
		system('/etc/init.d/network reload >/dev/null 2>&1 || true');
	}

	return {
		saved: true,
		message: changed ? 'Network devices saved and network reloaded.' : 'Network devices already up to date.',
		changed,
		devices: network_device_rows(),
		sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
	};
}

function save_network_routes(rows, allow_empty) {
	rows ||= [];
	allow_empty = allow_empty == true;
	uci.load('network');

	let changed = false;
	let config_changed = false;
	let keep = {};
	let existing = {};
	let existing_count = 0;
	let existing_order = [];
	let next_order = [];

	for (let section_type in ['route', 'route6']) {
		uci.foreach('network', section_type, function(section) {
			existing[section['.name']] = true;
			push(existing_order, section['.name']);
			existing_count++;
		});
	}

	if (!length(rows) && existing_count && !allow_empty)
		return {
			saved: false,
			message: 'Refusing to remove all static routes without confirmation.',
			changed: false,
			routes: network_route_rows(),
			sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
		};

	let validated = [];

	for (let row in rows) {
		let family = row?.family == 'route6' ? 'route6' : 'route';
		let section = dhcp_clean_value(row?.section || '');
		let is_existing = length(section) && uci.get('network', section) == family;
		let next = {
			interface: dhcp_clean_value(row?.interface || ''),
			type: dhcp_clean_value(row?.type || ''),
			target: dhcp_clean_value(row?.target || ''),
			netmask: family == 'route' ? dhcp_clean_value(row?.netmask || '') : '',
			gateway: dhcp_clean_value(row?.gateway || ''),
			metric: dhcp_clean_value(row?.metric || ''),
			table: dhcp_clean_value(row?.table || ''),
			source: dhcp_clean_value(row?.source || ''),
			mtu: dhcp_clean_value(row?.mtu || ''),
			onlink: dhcp_zero_one(row?.onlink),
			disabled: dhcp_zero_one(row?.disabled)
		};

		if (!valid_network_route_interface(next.interface))
			return {
				saved: false,
				message: 'Static route interface is required.',
				changed: false,
				routes: network_route_rows(),
				sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
			};

		for (let key, value in next) {
			if ((key == 'metric' || key == 'mtu') && value != '' && !dhcp_numeric_value(value))
				return {
					saved: false,
					message: 'Static route metric and MTU must be numeric.',
					changed: false,
					routes: network_route_rows(),
					sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
				};

			if ((key == 'type' || key == 'target' || key == 'netmask' || key == 'gateway' || key == 'table' || key == 'source') && !valid_network_route_text(value))
				return {
					saved: false,
					message: 'Static route contains unsupported characters.',
					changed: false,
					routes: network_route_rows(),
					sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
				};
		}

		push(validated, {
			section,
			family,
			is_existing,
			next
		});
	}

	for (let item in validated) {
		let section = item.section;

		if (!item.is_existing) {
			section = uci.add('network', item.family);
			changed = true;
			config_changed = true;
		}

		keep[section] = true;
		push(next_order, section);

		let next = item.next;

		for (let key, value in next) {
			let current = uci.get('network', section, key) || '';

			if ((key == 'onlink' || key == 'disabled') && value == '0' && current == '')
				continue;

			if (current != value) {
				changed = true;
				config_changed = true;
				if (((key == 'onlink' || key == 'disabled') && value == '0') || value == '')
					uci.delete('network', section, key);
				else
					uci.set('network', section, key, value);
			}
		}
	}

	for (let section in existing) {
		if (!keep[section]) {
			uci.delete('network', section);
			changed = true;
			config_changed = true;
		}
	}

	let current_order = [];
	for (let section in existing_order)
		if (keep[section])
			push(current_order, section);

	let order_changed = length(current_order) != length(next_order);
	if (!order_changed) {
		for (let i = 0; i < length(next_order); i++) {
			if (current_order[i] != next_order[i]) {
				order_changed = true;
				break;
			}
		}
	}

	if (order_changed)
		changed = true;

	if (changed) {
		if (config_changed)
			uci.commit('network');

		if (order_changed) {
			for (let i = 0; i < length(next_order); i++) {
				let section = next_order[i];

				if (replace(section, /[^A-Za-z0-9_.-]/g, '') == section)
					system('uci reorder network.' + section + '=' + i + ' >/dev/null 2>&1 || true');
			}

			system('uci commit network >/dev/null 2>&1 || true');
		}

		system('/etc/init.d/network reload >/dev/null 2>&1 || true');
	}

	return {
		saved: true,
		message: changed ? 'Static routes saved and network reloaded.' : 'Static routes already up to date.',
		changed,
		routes: network_route_rows(),
		sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
	};
}

function network_rule_rows() {
	let rules = [];

	try {
		uci.load('network');
	}
	catch (e) {
		return rules;
	}

	for (let section_type in ['rule', 'rule6']) {
		uci.foreach('network', section_type, function(section) {
			push(rules, {
				section: section['.name'] || '',
				family: section_type,
				in: section.in || '',
				out: section.out || '',
				src: section.src || '',
				dest: section.dest || '',
				priority: section.priority || '',
				lookup: section.lookup || section.table || '',
				fwmark: section.fwmark || section.mark || '',
				ipproto: section.ipproto || '',
				goto: section.goto || '',
				sport: section.sport || '',
				dport: section.dport || '',
				tos: section.tos || '',
				uidrange: section.uidrange || '',
				suppress_prefixlength: section.suppress_prefixlength || '',
				action: section.action || '',
				invert: section.invert || '',
				disabled: section.disabled || ''
			});
		});
	}

	return rules;
}

function valid_network_rule_name(value) {
	return value == '' || replace(value, /[^A-Za-z0-9_.:-]/g, '') == value;
}

function save_network_rules(rows, allow_empty) {
	rows ||= [];
	allow_empty = allow_empty == true;
	uci.load('network');

	let changed = false;
	let config_changed = false;
	let keep = {};
	let existing = {};
	let existing_count = 0;
	let existing_order = [];
	let next_order = [];

	for (let section_type in ['rule', 'rule6']) {
		uci.foreach('network', section_type, function(section) {
			existing[section['.name']] = true;
			push(existing_order, section['.name']);
			existing_count++;
		});
	}

	if (!length(rows) && existing_count && !allow_empty)
		return {
			saved: false,
			message: 'Refusing to remove all policy rules without confirmation.',
			changed: false,
			rules: network_rule_rows(),
			sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
		};

	let validated = [];

	for (let row in rows) {
		let family = row?.family == 'rule6' ? 'rule6' : 'rule';
		let section = dhcp_clean_value(row?.section || '');
		let is_existing = length(section) && uci.get('network', section) == family;
		let next = {
			in: dhcp_clean_value(row?.in || ''),
			out: dhcp_clean_value(row?.out || ''),
			src: dhcp_clean_value(row?.src || ''),
			dest: dhcp_clean_value(row?.dest || ''),
			priority: dhcp_clean_value(row?.priority || ''),
			lookup: dhcp_clean_value(row?.lookup || ''),
			fwmark: dhcp_clean_value(row?.fwmark || ''),
			ipproto: dhcp_clean_value(row?.ipproto || ''),
			goto: dhcp_clean_value(row?.goto || ''),
			sport: dhcp_clean_value(row?.sport || ''),
			dport: dhcp_clean_value(row?.dport || ''),
			tos: dhcp_clean_value(row?.tos || ''),
			uidrange: dhcp_clean_value(row?.uidrange || ''),
			suppress_prefixlength: dhcp_clean_value(row?.suppress_prefixlength || ''),
			action: dhcp_clean_value(row?.action || ''),
			invert: dhcp_zero_one(row?.invert),
			disabled: dhcp_zero_one(row?.disabled)
		};

		for (let key, value in next) {
			if ((key == 'priority' || key == 'ipproto' || key == 'goto' || key == 'suppress_prefixlength') && value != '' && !dhcp_numeric_value(value))
				return {
					saved: false,
					message: 'Policy rule priority, protocol, jump, and suppress prefix fields must be numeric.',
					changed: false,
					rules: network_rule_rows(),
					sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
				};

			if ((key == 'in' || key == 'out' || key == 'lookup' || key == 'action') && !valid_network_rule_name(value))
				return {
					saved: false,
					message: 'Policy rule interface, table, and action fields contain unsupported characters.',
					changed: false,
					rules: network_rule_rows(),
					sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
				};

			if ((key == 'src' || key == 'dest' || key == 'fwmark' || key == 'sport' || key == 'dport' || key == 'tos' || key == 'uidrange') && !valid_network_route_text(value))
				return {
					saved: false,
					message: 'Policy rule match fields contain unsupported characters.',
					changed: false,
					rules: network_rule_rows(),
					sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
				};
		}

		push(validated, {
			section,
			family,
			is_existing,
			next
		});
	}

	for (let item in validated) {
		let section = item.section;

		if (!item.is_existing) {
			section = uci.add('network', item.family);
			changed = true;
			config_changed = true;
		}

		keep[section] = true;
		push(next_order, section);

		let next = item.next;

		for (let key, value in next) {
			let current = uci.get('network', section, key) || '';

			if (key == 'lookup')
				current ||= uci.get('network', section, 'table') || '';
			else if (key == 'fwmark')
				current ||= uci.get('network', section, 'mark') || '';

			if ((key == 'invert' || key == 'disabled') && value == '0' && current == '')
				continue;

			if (current != value) {
				changed = true;
				config_changed = true;
				if (key == 'fwmark') {
					uci.delete('network', section, 'fwmark');
					if (value == '')
						uci.delete('network', section, 'mark');
					else
						uci.set('network', section, 'mark', value);
				}
				else if (((key == 'invert' || key == 'disabled') && value == '0') || value == '')
					uci.delete('network', section, key);
				else
					uci.set('network', section, key, value);
			}
		}
	}

	for (let section in existing) {
		if (!keep[section]) {
			uci.delete('network', section);
			changed = true;
			config_changed = true;
		}
	}

	let current_order = [];
	for (let section in existing_order)
		if (keep[section])
			push(current_order, section);

	let order_changed = length(current_order) != length(next_order);
	if (!order_changed) {
		for (let i = 0; i < length(next_order); i++) {
			if (current_order[i] != next_order[i]) {
				order_changed = true;
				break;
			}
		}
	}

	if (order_changed)
		changed = true;

	if (changed) {
		if (config_changed)
			uci.commit('network');

		if (order_changed) {
			for (let i = 0; i < length(next_order); i++) {
				let section = next_order[i];

				if (replace(section, /[^A-Za-z0-9_.-]/g, '') == section)
					system('uci reorder network.' + section + '=' + i + ' >/dev/null 2>&1 || true');
			}

			system('uci commit network >/dev/null 2>&1 || true');
		}

		system('/etc/init.d/network reload >/dev/null 2>&1 || true');
	}

	return {
		saved: true,
		message: changed ? 'Policy rules saved and network reloaded.' : 'Policy rules already up to date.',
		changed,
		rules: network_rule_rows(),
		sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
	};
}

function firewall_defaults_section() {
	let section = null;

	uci.load('firewall');
	uci.foreach('firewall', 'defaults', function(s) {
		section ??= s['.name'];
	});

	return section || uci.add('firewall', 'defaults');
}

function firewall_policy_value(value) {
	value = dhcp_clean_value(value || '');

	if (value == 'ACCEPT' || value == 'accept')
		return 'ACCEPT';

	if (value == 'REJECT' || value == 'reject')
		return 'REJECT';

	if (value == 'DROP' || value == 'drop')
		return 'DROP';

	return '';
}

function save_firewall_defaults(config) {
	config ||= {};
	uci.load('firewall');

	let section = firewall_defaults_section();
	let next = {
		input: firewall_policy_value(config.input || ''),
		output: firewall_policy_value(config.output || ''),
		forward: firewall_policy_value(config.forward || ''),
		synflood_protect: dhcp_zero_one(config.synflood_protect),
		drop_invalid: dhcp_zero_one(config.drop_invalid),
		flow_offloading: dhcp_zero_one(config.flow_offloading),
		flow_offloading_hw: dhcp_zero_one(config.flow_offloading_hw)
	};

	if (!length(next.input) || !length(next.output) || !length(next.forward))
		return {
			saved: false,
			message: 'Firewall default policies must be ACCEPT, REJECT, or DROP.',
			changed: false,
			section: (collect_uci_config('firewall', ['defaults']) || [])[0] || null,
			sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
		};

	let changed = false;

	for (let key, value in next) {
		let current = uci.get('firewall', section, key) || '';

		if ((key == 'drop_invalid' || key == 'flow_offloading' || key == 'flow_offloading_hw') && value == '0' && current == '')
			continue;

		if (current != value) {
			changed = true;
			if ((key == 'drop_invalid' || key == 'flow_offloading' || key == 'flow_offloading_hw') && value == '0')
				uci.delete('firewall', section, key);
			else
				uci.set('firewall', section, key, value);
		}
	}

	if (changed) {
		uci.commit('firewall');
		system('/etc/init.d/firewall reload >/dev/null 2>&1 || /etc/init.d/firewall restart >/dev/null 2>&1');
	}

	return {
		saved: true,
		message: changed ? 'Firewall defaults saved and firewall reloaded.' : 'Firewall defaults already up to date.',
		changed,
		section: (collect_uci_config('firewall', ['defaults']) || [])[0] || null,
		sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
	};
}

function firewall_zone_rows() {
	let zones = [];

	try {
		uci.load('firewall');
	}
	catch (e) {
		return zones;
	}

	uci.foreach('firewall', 'zone', function(section) {
		push(zones, {
			section: section['.name'] || '',
			name: section.name || '',
			network: join('\n', dhcp_normalize_list(section.network)),
			device: join('\n', dhcp_normalize_list(section.device)),
			input: section.input || '',
			output: section.output || '',
			forward: section.forward || '',
			masq: section.masq || '',
			mtu_fix: section.mtu_fix || '',
			subnet: join('\n', dhcp_normalize_list(section.subnet)),
			family: section.family || '',
			masq6: section.masq6 || '',
			masq_src: join('\n', dhcp_normalize_list(section.masq_src)),
			masq_dest: join('\n', dhcp_normalize_list(section.masq_dest)),
			masq_allow_invalid: section.masq_allow_invalid || '',
			auto_helper: section.auto_helper == '0' ? '0' : '1',
			helper: join('\n', dhcp_normalize_list(section.helper)),
			log: join('\n', dhcp_normalize_list(section.log)),
			log_limit: section.log_limit || '',
			extra_src: section.extra_src || '',
			extra_dest: section.extra_dest || ''
		});
	});

	return zones;
}

function valid_firewall_name(value) {
	return length(value) && replace(value, /[^A-Za-z0-9_.-]/g, '') == value;
}

function valid_firewall_list_values(values) {
	for (let value in values)
		if (!valid_network_rule_name(value))
			return false;

	return true;
}

function save_firewall_zones(rows) {
	rows ||= [];
	uci.load('firewall');

	let changed = false;
	let keep = {};
	let existing = {};
	let names = {};

	uci.foreach('firewall', 'zone', function(section) {
		existing[section['.name']] = true;
	});

	let validated = [];

	for (let row in rows) {
		let section = dhcp_clean_value(row?.section || '');
		let is_existing = length(section) && uci.get('firewall', section) == 'zone';
		let name = dhcp_clean_value(row?.name || '');
		let networks = split_dhcp_list(row?.network || '');
		let devices = split_dhcp_list(row?.device || '');
		let subnets = split_dhcp_list(row?.subnet || '');
		let masq_src = split_dhcp_list(row?.masq_src || '');
		let masq_dest = split_dhcp_list(row?.masq_dest || '');
		let helpers = split_dhcp_list(row?.helper || '');
		let log_tables = split_dhcp_list(row?.log || '');
		let family = firewall_family_value(row?.family || '');
		let next = {
			name,
			input: firewall_policy_value(row?.input || ''),
			output: firewall_policy_value(row?.output || ''),
			forward: firewall_policy_value(row?.forward || ''),
			masq: dhcp_zero_one(row?.masq),
			mtu_fix: dhcp_zero_one(row?.mtu_fix),
			family,
			masq6: dhcp_zero_one(row?.masq6),
			masq_allow_invalid: dhcp_zero_one(row?.masq_allow_invalid),
			auto_helper: dhcp_zero_one(row?.auto_helper),
			log_limit: dhcp_clean_value(row?.log_limit || ''),
			extra_src: dhcp_clean_value(row?.extra_src || ''),
			extra_dest: dhcp_clean_value(row?.extra_dest || '')
		};

		if (!valid_firewall_name(name))
			return {
				saved: false,
				message: 'Firewall zone name is required and may contain only letters, numbers, dots, dashes, and underscores.',
				changed: false,
				zones: firewall_zone_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		if (names[name])
			return {
				saved: false,
				message: 'Firewall zone names must be unique.',
				changed: false,
				zones: firewall_zone_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		names[name] = true;

		if (!length(next.input) || !length(next.output) || !length(next.forward))
			return {
				saved: false,
				message: 'Firewall zone policies must be ACCEPT, REJECT, or DROP.',
				changed: false,
				zones: firewall_zone_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		if (family == null)
			return {
				saved: false,
				message: 'Firewall zone family must be any, ipv4, ipv6, or blank.',
				changed: false,
				zones: firewall_zone_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		if (!valid_firewall_list_values(networks) || !valid_firewall_list_values(devices))
			return {
				saved: false,
				message: 'Firewall zone networks and devices contain unsupported characters.',
				changed: false,
				zones: firewall_zone_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		if (!valid_firewall_rule_list(subnets) || !valid_firewall_rule_list(masq_src) || !valid_firewall_rule_list(masq_dest) || !valid_firewall_rule_list(helpers) || !valid_firewall_rule_list(log_tables) || !valid_firewall_rule_value(next.log_limit) || !valid_firewall_rule_value(next.extra_src) || !valid_firewall_rule_value(next.extra_dest))
			return {
				saved: false,
				message: 'Firewall zone advanced fields contain unsupported characters.',
				changed: false,
				zones: firewall_zone_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		push(validated, {
			section,
			is_existing,
			networks,
			devices,
			subnets,
			masq_src,
			masq_dest,
			helpers,
			log_tables,
			next
		});
	}

	for (let item in validated) {
		let section = item.section;

		if (!item.is_existing) {
			section = uci.add('firewall', 'zone');
			changed = true;
		}

		keep[section] = true;

		let networks = item.networks;
		let devices = item.devices;
		let subnets = item.subnets;
		let masq_src = item.masq_src;
		let masq_dest = item.masq_dest;
		let helpers = item.helpers;
		let log_tables = item.log_tables;
		let next = item.next;

		for (let key, value in next) {
			let current = uci.get('firewall', section, key) || '';

			if ((key == 'masq' || key == 'mtu_fix' || key == 'masq6' || key == 'masq_allow_invalid') && value == '0' && current == '')
				continue;

			if (key == 'auto_helper' && value == '1' && current == '')
				continue;

			if (current != value) {
				changed = true;
				if (((key == 'masq' || key == 'mtu_fix' || key == 'masq6' || key == 'masq_allow_invalid') && value == '0') || (key == 'auto_helper' && value == '1') || value == '')
					uci.delete('firewall', section, key);
				else
					uci.set('firewall', section, key, value);
			}
		}

		if (!same_dhcp_list(uci.get('firewall', section, 'network') || [], networks)) {
			changed = true;
			if (length(networks))
				uci.set('firewall', section, 'network', length(networks) == 1 ? networks[0] : networks);
			else
				uci.delete('firewall', section, 'network');
		}

		if (!same_dhcp_list(uci.get('firewall', section, 'device') || [], devices)) {
			changed = true;
			if (length(devices))
				uci.set('firewall', section, 'device', length(devices) == 1 ? devices[0] : devices);
			else
				uci.delete('firewall', section, 'device');
		}

		if (!same_dhcp_list(uci.get('firewall', section, 'subnet') || [], subnets)) {
			changed = true;
			if (length(subnets))
				uci.set('firewall', section, 'subnet', length(subnets) == 1 ? subnets[0] : subnets);
			else
				uci.delete('firewall', section, 'subnet');
		}

		if (!same_dhcp_list(uci.get('firewall', section, 'masq_src') || [], masq_src)) {
			changed = true;
			if (length(masq_src))
				uci.set('firewall', section, 'masq_src', length(masq_src) == 1 ? masq_src[0] : masq_src);
			else
				uci.delete('firewall', section, 'masq_src');
		}

		if (!same_dhcp_list(uci.get('firewall', section, 'masq_dest') || [], masq_dest)) {
			changed = true;
			if (length(masq_dest))
				uci.set('firewall', section, 'masq_dest', length(masq_dest) == 1 ? masq_dest[0] : masq_dest);
			else
				uci.delete('firewall', section, 'masq_dest');
		}

		if (!same_dhcp_list(uci.get('firewall', section, 'helper') || [], helpers)) {
			changed = true;
			if (length(helpers))
				uci.set('firewall', section, 'helper', length(helpers) == 1 ? helpers[0] : helpers);
			else
				uci.delete('firewall', section, 'helper');
		}

		if (!same_dhcp_list(uci.get('firewall', section, 'log') || [], log_tables)) {
			changed = true;
			if (length(log_tables))
				uci.set('firewall', section, 'log', length(log_tables) == 1 ? log_tables[0] : log_tables);
			else
				uci.delete('firewall', section, 'log');
		}
	}

	for (let section in existing) {
		if (!keep[section]) {
			uci.delete('firewall', section);
			changed = true;
		}
	}

	if (changed) {
		uci.commit('firewall');
		system('/etc/init.d/firewall reload >/dev/null 2>&1 || /etc/init.d/firewall restart >/dev/null 2>&1');
	}

	return {
		saved: true,
		message: changed ? 'Firewall zones saved and firewall reloaded.' : 'Firewall zones already up to date.',
		changed,
		zones: firewall_zone_rows(),
		sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
	};
}

function firewall_forwarding_rows() {
	let forwardings = [];

	try {
		uci.load('firewall');
	}
	catch (e) {
		return forwardings;
	}

	uci.foreach('firewall', 'forwarding', function(section) {
		push(forwardings, {
			section: section['.name'] || '',
			src: section.src || '',
			dest: section.dest || ''
		});
	});

	return forwardings;
}

function save_firewall_forwardings(rows) {
	rows ||= [];
	uci.load('firewall');

	let changed = false;
	let keep = {};
	let existing = {};

	uci.foreach('firewall', 'forwarding', function(section) {
		existing[section['.name']] = true;
	});

	let validated = [];

	for (let row in rows) {
		let section = dhcp_clean_value(row?.section || '');
		let is_existing = length(section) && uci.get('firewall', section) == 'forwarding';
		let src = dhcp_clean_value(row?.src || '');
		let dest = dhcp_clean_value(row?.dest || '');

		if (!valid_firewall_name(src) || !valid_firewall_name(dest))
			return {
				saved: false,
				message: 'Firewall forwarding source and destination zones are required.',
				changed: false,
				forwardings: firewall_forwarding_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		push(validated, {
			section,
			is_existing,
			next: { src, dest }
		});
	}

	for (let item in validated) {
		let section = item.section;

		if (!item.is_existing) {
			section = uci.add('firewall', 'forwarding');
			changed = true;
		}

		keep[section] = true;

		let next = item.next;

		for (let key, value in next) {
			let current = uci.get('firewall', section, key) || '';

			if (current != value) {
				changed = true;
				uci.set('firewall', section, key, value);
			}
		}
	}

	for (let section in existing) {
		if (!keep[section]) {
			uci.delete('firewall', section);
			changed = true;
		}
	}

	if (changed) {
		uci.commit('firewall');
		system('/etc/init.d/firewall reload >/dev/null 2>&1 || /etc/init.d/firewall restart >/dev/null 2>&1');
	}

	return {
		saved: true,
		message: changed ? 'Firewall forwardings saved and firewall reloaded.' : 'Firewall forwardings already up to date.',
		changed,
		forwardings: firewall_forwarding_rows(),
		sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
	};
}

function firewall_rule_rows() {
	let rules = [];

	try {
		uci.load('firewall');
	}
	catch (e) {
		return rules;
	}

	uci.foreach('firewall', 'rule', function(section) {
		push(rules, {
			section: section['.name'] || '',
			name: section.name || '',
			enabled: section.enabled == '0' ? '0' : '1',
			src: section.src || '',
			dest: section.dest || '',
			proto: join('\n', dhcp_normalize_list(section.proto)),
			src_ip: section.src_ip || '',
			dest_ip: section.dest_ip || '',
			src_port: section.src_port || '',
			dest_port: section.dest_port || '',
			icmp_type: join('\n', dhcp_normalize_list(section.icmp_type)),
			family: section.family || '',
			direction: section.direction || '',
			device: section.device || '',
			ipset: section.ipset || '',
			src_mac: join('\n', dhcp_normalize_list(section.src_mac)),
			set_mark: section.set_mark || '',
			set_xmark: section.set_xmark || '',
			set_dscp: section.set_dscp || '',
			set_helper: section.set_helper || '',
			helper: section.helper || '',
			mark: section.mark || '',
			dscp: section.dscp || '',
			limit: section.limit || '',
			limit_burst: section.limit_burst || '',
			log: section.log == '1' ? '1' : '0',
			log_limit: section.log_limit || '',
			extra: section.extra || '',
			weekdays: join('\n', dhcp_normalize_list(section.weekdays)),
			monthdays: join('\n', dhcp_normalize_list(section.monthdays)),
			start_time: section.start_time || '',
			stop_time: section.stop_time || '',
			start_date: section.start_date || '',
			stop_date: section.stop_date || '',
			utc_time: section.utc_time == '1' ? '1' : '0',
			target: section.target || ''
		});
	});

	return rules;
}

function valid_firewall_rule_value(value) {
	return value == '' || replace(value, /[^A-Za-z0-9:._/*%!, -]/g, '') == value;
}

function valid_firewall_rule_list(values) {
	for (let value in values)
		if (!valid_firewall_rule_value(value))
			return false;

	return true;
}

function firewall_family_value(value) {
	value = dhcp_clean_value(value || '');

	if (value == '' || value == 'any' || value == 'ipv4' || value == 'ipv6')
		return value;

	return null;
}

function firewall_rule_target_value(value) {
	value = uc(value || '');

	if (value == 'ACCEPT' || value == 'REJECT' || value == 'DROP' || value == 'NOTRACK' || value == 'HELPER' || value == 'MARK' || value == 'DSCP')
		return value;

	return '';
}

function save_firewall_rules(rows) {
	rows ||= [];
	uci.load('firewall');

	let changed = false;
	let keep = {};
	let existing = {};

	uci.foreach('firewall', 'rule', function(section) {
		existing[section['.name']] = true;
	});

	let validated = [];

	for (let row in rows) {
		let section = dhcp_clean_value(row?.section || '');
		let is_existing = length(section) && uci.get('firewall', section) == 'rule';
		let proto = split_dhcp_list(row?.proto || '');
		let icmp_type = split_dhcp_list(row?.icmp_type || '');
		let src_mac = split_dhcp_list(row?.src_mac || '');
		let weekdays = split_dhcp_list(row?.weekdays || '');
		let monthdays = split_dhcp_list(row?.monthdays || '');
		let family = firewall_family_value(row?.family || '');
		let target = firewall_rule_target_value(row?.target || 'ACCEPT');
		let direction = dhcp_clean_value(row?.direction || '');
		let next = {
			name: dhcp_clean_value(row?.name || ''),
			enabled: dhcp_zero_one(row?.enabled),
			src: dhcp_clean_value(row?.src || ''),
			dest: dhcp_clean_value(row?.dest || ''),
			src_ip: dhcp_clean_value(row?.src_ip || ''),
			dest_ip: dhcp_clean_value(row?.dest_ip || ''),
			src_port: dhcp_clean_value(row?.src_port || ''),
			dest_port: dhcp_clean_value(row?.dest_port || ''),
			family,
			direction,
			device: dhcp_clean_value(row?.device || ''),
			ipset: dhcp_clean_value(row?.ipset || ''),
			set_mark: dhcp_clean_value(row?.set_mark || ''),
			set_xmark: dhcp_clean_value(row?.set_xmark || ''),
			set_dscp: dhcp_clean_value(row?.set_dscp || ''),
			set_helper: dhcp_clean_value(row?.set_helper || ''),
			helper: dhcp_clean_value(row?.helper || ''),
			mark: dhcp_clean_value(row?.mark || ''),
			dscp: dhcp_clean_value(row?.dscp || ''),
			limit: dhcp_clean_value(row?.limit || ''),
			limit_burst: dhcp_clean_value(row?.limit_burst || ''),
			log: dhcp_zero_one(row?.log),
			log_limit: dhcp_clean_value(row?.log_limit || ''),
			extra: dhcp_clean_value(row?.extra || ''),
			start_time: dhcp_clean_value(row?.start_time || ''),
			stop_time: dhcp_clean_value(row?.stop_time || ''),
			start_date: dhcp_clean_value(row?.start_date || ''),
			stop_date: dhcp_clean_value(row?.stop_date || ''),
			utc_time: dhcp_zero_one(row?.utc_time),
			target
		};

		if (!length(next.name))
			return {
				saved: false,
				message: 'Firewall rule name is required.',
				changed: false,
				rules: firewall_rule_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		if (!length(target))
			return {
				saved: false,
				message: 'Firewall rule target must be ACCEPT, REJECT, DROP, NOTRACK, HELPER, MARK, or DSCP.',
				changed: false,
				rules: firewall_rule_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		if (family == null)
			return {
				saved: false,
				message: 'Firewall rule family must be any, ipv4, ipv6, or blank.',
				changed: false,
				rules: firewall_rule_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		if (direction != '' && direction != 'in' && direction != 'out')
			return {
				saved: false,
				message: 'Firewall rule direction must be in, out, or blank.',
				changed: false,
				rules: firewall_rule_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		for (let key, value in next) {
			if ((key == 'src' || key == 'dest') && value != '' && value != '*' && !valid_firewall_name(value))
				return {
					saved: false,
					message: 'Firewall rule zone names contain unsupported characters.',
					changed: false,
					rules: firewall_rule_rows(),
					sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
				};

			if ((key == 'src_ip' || key == 'dest_ip' || key == 'src_port' || key == 'dest_port' || key == 'device' || key == 'ipset' || key == 'set_mark' || key == 'set_xmark' || key == 'set_dscp' || key == 'set_helper' || key == 'helper' || key == 'mark' || key == 'dscp' || key == 'limit' || key == 'limit_burst' || key == 'log_limit' || key == 'extra' || key == 'start_time' || key == 'stop_time' || key == 'start_date' || key == 'stop_date') && !valid_firewall_rule_value(value))
				return {
					saved: false,
					message: 'Firewall rule match fields contain unsupported characters.',
					changed: false,
					rules: firewall_rule_rows(),
					sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
				};
		}

		if (!valid_firewall_rule_list(proto) || !valid_firewall_rule_list(icmp_type) || !valid_firewall_rule_list(src_mac) || !valid_firewall_rule_list(weekdays) || !valid_firewall_rule_list(monthdays))
			return {
				saved: false,
				message: 'Firewall rule list fields contain unsupported characters.',
				changed: false,
				rules: firewall_rule_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		push(validated, {
			section,
			is_existing,
			proto,
			icmp_type,
			src_mac,
			weekdays,
			monthdays,
			next
		});
	}

	for (let item in validated) {
		let section = item.section;

		if (!item.is_existing) {
			section = uci.add('firewall', 'rule');
			changed = true;
		}

		keep[section] = true;

		let proto = item.proto;
		let icmp_type = item.icmp_type;
		let src_mac = item.src_mac;
		let weekdays = item.weekdays;
		let monthdays = item.monthdays;
		let next = item.next;

		for (let key, value in next) {
			let current = uci.get('firewall', section, key) || '';

			if (key == 'enabled' && value == '1' && current == '')
				continue;

			if ((key == 'log' || key == 'utc_time') && value == '0' && current == '')
				continue;

			if (current != value) {
				changed = true;
				if ((key == 'enabled' && value == '1') || ((key == 'log' || key == 'utc_time') && value == '0') || value == '')
					uci.delete('firewall', section, key);
				else
					uci.set('firewall', section, key, value);
			}
		}

		if (!same_dhcp_list(uci.get('firewall', section, 'proto') || [], proto)) {
			changed = true;
			if (length(proto))
				uci.set('firewall', section, 'proto', length(proto) == 1 ? proto[0] : proto);
			else
				uci.delete('firewall', section, 'proto');
		}

		if (!same_dhcp_list(uci.get('firewall', section, 'icmp_type') || [], icmp_type)) {
			changed = true;
			if (length(icmp_type))
				uci.set('firewall', section, 'icmp_type', length(icmp_type) == 1 ? icmp_type[0] : icmp_type);
			else
				uci.delete('firewall', section, 'icmp_type');
		}

		if (!same_dhcp_list(uci.get('firewall', section, 'src_mac') || [], src_mac)) {
			changed = true;
			if (length(src_mac))
				uci.set('firewall', section, 'src_mac', length(src_mac) == 1 ? src_mac[0] : src_mac);
			else
				uci.delete('firewall', section, 'src_mac');
		}

		if (!same_dhcp_list(uci.get('firewall', section, 'weekdays') || [], weekdays)) {
			changed = true;
			if (length(weekdays))
				uci.set('firewall', section, 'weekdays', length(weekdays) == 1 ? weekdays[0] : weekdays);
			else
				uci.delete('firewall', section, 'weekdays');
		}

		if (!same_dhcp_list(uci.get('firewall', section, 'monthdays') || [], monthdays)) {
			changed = true;
			if (length(monthdays))
				uci.set('firewall', section, 'monthdays', length(monthdays) == 1 ? monthdays[0] : monthdays);
			else
				uci.delete('firewall', section, 'monthdays');
		}
	}

	for (let section in existing) {
		if (!keep[section]) {
			uci.delete('firewall', section);
			changed = true;
		}
	}

	if (changed) {
		uci.commit('firewall');
		system('/etc/init.d/firewall reload >/dev/null 2>&1 || /etc/init.d/firewall restart >/dev/null 2>&1');
	}

	return {
		saved: true,
		message: changed ? 'Firewall rules saved and firewall reloaded.' : 'Firewall rules already up to date.',
		changed,
		rules: firewall_rule_rows(),
		sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
	};
}

function firewall_redirect_rows() {
	let redirects = [];

	try {
		uci.load('firewall');
	}
	catch (e) {
		return redirects;
	}

	uci.foreach('firewall', 'redirect', function(section) {
		push(redirects, {
			section: section['.name'] || '',
			name: section.name || '',
			enabled: section.enabled == '0' ? '0' : '1',
			src: section.src || '',
			src_ip: section.src_ip || '',
			src_mac: join('\n', dhcp_normalize_list(section.src_mac)),
			src_port: section.src_port || '',
			src_dip: section.src_dip || '',
			src_dport: section.src_dport || '',
			dest: section.dest || '',
			dest_ip: section.dest_ip || '',
			dest_port: section.dest_port || '',
			proto: join('\n', dhcp_normalize_list(section.proto)),
			family: section.family || '',
			target: section.target || 'DNAT',
			ipset: section.ipset || '',
			reflection: section.reflection == '0' ? '0' : '1',
			reflection_src: section.reflection_src || '',
			reflection_zone: join('\n', dhcp_normalize_list(section.reflection_zone)),
			helper: section.helper || '',
			mark: section.mark || '',
			limit: section.limit || '',
			limit_burst: section.limit_burst || '',
			log: section.log == '1' ? '1' : '0',
			log_limit: section.log_limit || '',
			extra: section.extra || ''
		});
	});

	return redirects;
}

function firewall_redirect_target_value(value) {
	value = dhcp_clean_value(value || 'DNAT');

	if (value == 'DNAT' || value == 'dnat')
		return 'DNAT';

	if (value == 'SNAT' || value == 'snat')
		return 'SNAT';

	return '';
}

function save_firewall_redirects(rows) {
	rows ||= [];
	uci.load('firewall');

	let changed = false;
	let keep = {};
	let existing = {};

	uci.foreach('firewall', 'redirect', function(section) {
		existing[section['.name']] = true;
	});

	let validated = [];

	for (let row in rows) {
		let section = dhcp_clean_value(row?.section || '');
		let is_existing = length(section) && uci.get('firewall', section) == 'redirect';
		let proto = split_dhcp_list(row?.proto || '');
		let src_mac = split_dhcp_list(row?.src_mac || '');
		let reflection_zone = split_dhcp_list(row?.reflection_zone || '');
		let family = firewall_family_value(row?.family || '');
		let target = firewall_redirect_target_value(row?.target || 'DNAT');
		let reflection_src = dhcp_clean_value(row?.reflection_src || '');
		let next = {
			name: dhcp_clean_value(row?.name || ''),
			enabled: dhcp_zero_one(row?.enabled),
			src: dhcp_clean_value(row?.src || ''),
			src_ip: dhcp_clean_value(row?.src_ip || ''),
			src_port: dhcp_clean_value(row?.src_port || ''),
			src_dip: dhcp_clean_value(row?.src_dip || ''),
			src_dport: dhcp_clean_value(row?.src_dport || ''),
			dest: dhcp_clean_value(row?.dest || ''),
			dest_ip: dhcp_clean_value(row?.dest_ip || ''),
			dest_port: dhcp_clean_value(row?.dest_port || ''),
			family,
			target,
			ipset: dhcp_clean_value(row?.ipset || ''),
			reflection: dhcp_zero_one(row?.reflection),
			reflection_src,
			helper: dhcp_clean_value(row?.helper || ''),
			mark: dhcp_clean_value(row?.mark || ''),
			limit: dhcp_clean_value(row?.limit || ''),
			limit_burst: dhcp_clean_value(row?.limit_burst || ''),
			log: dhcp_zero_one(row?.log),
			log_limit: dhcp_clean_value(row?.log_limit || ''),
			extra: dhcp_clean_value(row?.extra || '')
		};

		if (!length(next.name))
			return {
				saved: false,
				message: 'Firewall redirect name is required.',
				changed: false,
				redirects: firewall_redirect_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		if (!length(target))
			return {
				saved: false,
				message: 'Firewall redirect target must be DNAT or SNAT.',
				changed: false,
				redirects: firewall_redirect_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		if (family == null)
			return {
				saved: false,
				message: 'Firewall redirect family must be any, ipv4, ipv6, or blank.',
				changed: false,
				redirects: firewall_redirect_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		if (reflection_src != '' && reflection_src != 'internal' && reflection_src != 'external')
			return {
				saved: false,
				message: 'Firewall redirect loopback source must be internal or external.',
				changed: false,
				redirects: firewall_redirect_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		for (let key, value in next) {
			if ((key == 'src' || key == 'dest') && value != '' && value != '*' && !valid_firewall_name(value))
				return {
					saved: false,
					message: 'Firewall redirect zone names contain unsupported characters.',
					changed: false,
					redirects: firewall_redirect_rows(),
					sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
				};

			if ((key == 'src_ip' || key == 'src_port' || key == 'src_dip' || key == 'src_dport' || key == 'dest_ip' || key == 'dest_port' || key == 'ipset' || key == 'helper' || key == 'mark' || key == 'limit' || key == 'limit_burst' || key == 'log_limit' || key == 'extra') && !valid_firewall_rule_value(value))
				return {
					saved: false,
					message: 'Firewall redirect match fields contain unsupported characters.',
					changed: false,
					redirects: firewall_redirect_rows(),
					sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
				};
		}

		if (!valid_firewall_rule_list(proto))
			return {
				saved: false,
				message: 'Firewall redirect protocol field contains unsupported characters.',
				changed: false,
				redirects: firewall_redirect_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		if (!valid_firewall_rule_list(src_mac) || !valid_firewall_list_values(reflection_zone))
			return {
				saved: false,
				message: 'Firewall redirect MAC or reflection zone fields contain unsupported characters.',
				changed: false,
				redirects: firewall_redirect_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		push(validated, {
			section,
			is_existing,
			proto,
			src_mac,
			reflection_zone,
			next
		});
	}

	for (let item in validated) {
		let section = item.section;

		if (!item.is_existing) {
			section = uci.add('firewall', 'redirect');
			changed = true;
		}

		keep[section] = true;

		let proto = item.proto;
		let src_mac = item.src_mac;
		let reflection_zone = item.reflection_zone;
		let next = item.next;

		for (let key, value in next) {
			let current = uci.get('firewall', section, key) || '';

			if (key == 'enabled' && value == '1' && current == '')
				continue;

			if (key == 'target' && value == 'DNAT' && current == '')
				continue;

			if ((key == 'enabled' || key == 'reflection') && value == '1' && current == '')
				continue;

			if (key == 'reflection_src' && value == 'internal') {
				if (current != '') {
					changed = true;
					uci.delete('firewall', section, key);
				}
				continue;
			}

			if (key == 'log' && value == '0' && current == '')
				continue;

			if (current != value) {
				changed = true;
				if (((key == 'enabled' || key == 'reflection') && value == '1') || (key == 'log' && value == '0') || (key == 'target' && value == 'DNAT') || value == '')
					uci.delete('firewall', section, key);
				else
					uci.set('firewall', section, key, value);
			}
		}

		if (!same_dhcp_list(uci.get('firewall', section, 'proto') || [], proto)) {
			changed = true;
			if (length(proto))
				uci.set('firewall', section, 'proto', length(proto) == 1 ? proto[0] : proto);
			else
				uci.delete('firewall', section, 'proto');
		}

		if (!same_dhcp_list(uci.get('firewall', section, 'src_mac') || [], src_mac)) {
			changed = true;
			if (length(src_mac))
				uci.set('firewall', section, 'src_mac', length(src_mac) == 1 ? src_mac[0] : src_mac);
			else
				uci.delete('firewall', section, 'src_mac');
		}

		if (!same_dhcp_list(uci.get('firewall', section, 'reflection_zone') || [], reflection_zone)) {
			changed = true;
			if (length(reflection_zone))
				uci.set('firewall', section, 'reflection_zone', length(reflection_zone) == 1 ? reflection_zone[0] : reflection_zone);
			else
				uci.delete('firewall', section, 'reflection_zone');
		}
	}

	for (let section in existing) {
		if (!keep[section]) {
			uci.delete('firewall', section);
			changed = true;
		}
	}

	if (changed) {
		uci.commit('firewall');
		system('/etc/init.d/firewall reload >/dev/null 2>&1 || /etc/init.d/firewall restart >/dev/null 2>&1');
	}

	return {
		saved: true,
		message: changed ? 'Firewall redirects saved and firewall reloaded.' : 'Firewall redirects already up to date.',
		changed,
		redirects: firewall_redirect_rows(),
		sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
	};
}

function firewall_nat_rows() {
	let nats = [];

	try {
		uci.load('firewall');
	}
	catch (e) {
		return nats;
	}

	uci.foreach('firewall', 'nat', function(section) {
		push(nats, {
			section: section['.name'] || '',
			name: section.name || '',
			enabled: section.enabled == '0' ? '0' : '1',
			family: section.family || '',
			proto: join('\n', dhcp_normalize_list(section.proto)),
			src: section.src || '',
			src_ip: section.src_ip || '',
			src_port: section.src_port || '',
			dest_ip: section.dest_ip || '',
			dest_port: section.dest_port || '',
			target: section.target || 'SNAT',
			snat_ip: section.snat_ip || '',
			snat_port: section.snat_port || '',
			ipset: section.ipset || '',
			device: section.device || '',
			mark: section.mark || '',
			limit: section.limit || '',
			limit_burst: section.limit_burst || '',
			log: section.log == '1' ? '1' : '0',
			extra: section.extra || '',
			weekdays: join('\n', dhcp_normalize_list(section.weekdays)),
			monthdays: join('\n', dhcp_normalize_list(section.monthdays)),
			start_time: section.start_time || '',
			stop_time: section.stop_time || '',
			start_date: section.start_date || '',
			stop_date: section.stop_date || '',
			utc_time: section.utc_time == '1' ? '1' : '0'
		});
	});

	return nats;
}

function firewall_nat_target_value(value) {
	value = uc(value || 'SNAT');

	if (value == 'SNAT' || value == 'MASQUERADE' || value == 'ACCEPT')
		return value;

	return '';
}

function save_firewall_nats(rows) {
	rows ||= [];
	uci.load('firewall');

	let changed = false;
	let keep = {};
	let existing = {};

	uci.foreach('firewall', 'nat', function(section) {
		existing[section['.name']] = true;
	});

	let validated = [];

	for (let row in rows) {
		let section = dhcp_clean_value(row?.section || '');
		let is_existing = length(section) && uci.get('firewall', section) == 'nat';
		let proto = split_dhcp_list(row?.proto || '');
		let weekdays = split_dhcp_list(row?.weekdays || '');
		let monthdays = split_dhcp_list(row?.monthdays || '');
		let family = firewall_family_value(row?.family || '');
		let target = firewall_nat_target_value(row?.target || 'SNAT');
		let next = {
			name: dhcp_clean_value(row?.name || ''),
			enabled: dhcp_zero_one(row?.enabled),
			family,
			src: dhcp_clean_value(row?.src || ''),
			src_ip: dhcp_clean_value(row?.src_ip || ''),
			src_port: dhcp_clean_value(row?.src_port || ''),
			dest_ip: dhcp_clean_value(row?.dest_ip || ''),
			dest_port: dhcp_clean_value(row?.dest_port || ''),
			target,
			snat_ip: dhcp_clean_value(row?.snat_ip || ''),
			snat_port: dhcp_clean_value(row?.snat_port || ''),
			ipset: dhcp_clean_value(row?.ipset || ''),
			device: dhcp_clean_value(row?.device || ''),
			mark: dhcp_clean_value(row?.mark || ''),
			limit: dhcp_clean_value(row?.limit || ''),
			limit_burst: dhcp_clean_value(row?.limit_burst || ''),
			log: dhcp_zero_one(row?.log),
			extra: dhcp_clean_value(row?.extra || ''),
			start_time: dhcp_clean_value(row?.start_time || ''),
			stop_time: dhcp_clean_value(row?.stop_time || ''),
			start_date: dhcp_clean_value(row?.start_date || ''),
			stop_date: dhcp_clean_value(row?.stop_date || ''),
			utc_time: dhcp_zero_one(row?.utc_time)
		};

		if (!length(next.name))
			return {
				saved: false,
				message: 'Firewall NAT rule name is required.',
				changed: false,
				nats: firewall_nat_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		if (!length(target))
			return {
				saved: false,
				message: 'Firewall NAT target must be SNAT, MASQUERADE, or ACCEPT.',
				changed: false,
				nats: firewall_nat_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		if (family == null)
			return {
				saved: false,
				message: 'Firewall NAT family must be any, ipv4, ipv6, or blank.',
				changed: false,
				nats: firewall_nat_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		if (target == 'SNAT' && !length(next.snat_ip) && !length(next.snat_port))
			return {
				saved: false,
				message: 'SNAT rules require a rewrite IP address or rewrite port.',
				changed: false,
				nats: firewall_nat_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		if (next.src != '' && next.src != '*' && !valid_firewall_name(next.src))
			return {
				saved: false,
				message: 'Firewall NAT outbound zone contains unsupported characters.',
				changed: false,
				nats: firewall_nat_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		for (let key, value in next)
			if ((key == 'src_ip' || key == 'src_port' || key == 'dest_ip' || key == 'dest_port' || key == 'snat_ip' || key == 'snat_port' || key == 'ipset' || key == 'device' || key == 'mark' || key == 'limit' || key == 'limit_burst' || key == 'extra' || key == 'start_time' || key == 'stop_time' || key == 'start_date' || key == 'stop_date') && !valid_firewall_rule_value(value))
				return {
					saved: false,
					message: 'Firewall NAT fields contain unsupported characters.',
					changed: false,
					nats: firewall_nat_rows(),
					sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
				};

		if (!valid_firewall_rule_list(proto) || !valid_firewall_rule_list(weekdays) || !valid_firewall_rule_list(monthdays))
			return {
				saved: false,
				message: 'Firewall NAT list fields contain unsupported characters.',
				changed: false,
				nats: firewall_nat_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		push(validated, {
			section,
			is_existing,
			proto,
			weekdays,
			monthdays,
			next
		});
	}

	for (let item in validated) {
		let section = item.section;

		if (!item.is_existing) {
			section = uci.add('firewall', 'nat');
			changed = true;
		}

		keep[section] = true;

		let proto = item.proto;
		let weekdays = item.weekdays;
		let monthdays = item.monthdays;
		let next = item.next;

		for (let key, value in next) {
			let current = uci.get('firewall', section, key) || '';

			if (key == 'enabled' && value == '1' && current == '')
				continue;

			if (key == 'target' && value == 'SNAT' && current == '')
				continue;

			if ((key == 'log' || key == 'utc_time') && value == '0' && current == '')
				continue;

			if (current != value) {
				changed = true;
				if ((key == 'enabled' && value == '1') || (key == 'target' && value == 'SNAT') || ((key == 'log' || key == 'utc_time') && value == '0') || value == '')
					uci.delete('firewall', section, key);
				else
					uci.set('firewall', section, key, value);
			}
		}

		if (!same_dhcp_list(uci.get('firewall', section, 'proto') || [], proto)) {
			changed = true;
			if (length(proto))
				uci.set('firewall', section, 'proto', length(proto) == 1 ? proto[0] : proto);
			else
				uci.delete('firewall', section, 'proto');
		}

		if (!same_dhcp_list(uci.get('firewall', section, 'weekdays') || [], weekdays)) {
			changed = true;
			if (length(weekdays))
				uci.set('firewall', section, 'weekdays', length(weekdays) == 1 ? weekdays[0] : weekdays);
			else
				uci.delete('firewall', section, 'weekdays');
		}

		if (!same_dhcp_list(uci.get('firewall', section, 'monthdays') || [], monthdays)) {
			changed = true;
			if (length(monthdays))
				uci.set('firewall', section, 'monthdays', length(monthdays) == 1 ? monthdays[0] : monthdays);
			else
				uci.delete('firewall', section, 'monthdays');
		}
	}

	for (let section in existing) {
		if (!keep[section]) {
			uci.delete('firewall', section);
			changed = true;
		}
	}

	if (changed) {
		uci.commit('firewall');
		system('/etc/init.d/firewall reload >/dev/null 2>&1 || /etc/init.d/firewall restart >/dev/null 2>&1');
	}

	return {
		saved: true,
		message: changed ? 'Firewall NAT rules saved and firewall reloaded.' : 'Firewall NAT rules already up to date.',
		changed,
		nats: firewall_nat_rows(),
		sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
	};
}

function firewall_ipset_rows() {
	let ipsets = [];

	try {
		uci.load('firewall');
	}
	catch (e) {
		return ipsets;
	}

	uci.foreach('firewall', 'ipset', function(section) {
		push(ipsets, {
			section: section['.name'] || '',
			name: section.name || '',
			comment: section.comment || '',
			family: section.family || '',
			match: join('\n', dhcp_normalize_list(section.match)),
			entry: join('\n', dhcp_normalize_list(section.entry)),
			maxelem: section.maxelem || '',
			external: section.external || '',
			storage: section.storage || '',
			iprange: section.iprange || '',
			portrange: section.portrange || '',
			netmask: section.netmask || '',
			hashsize: section.hashsize || '',
			loadfile: section.loadfile || '',
			timeout: section.timeout || '',
			counters: section.counters || '',
			enabled: section.enabled == '0' ? '0' : '1'
		});
	});

	return ipsets;
}

function valid_firewall_ipset_name(value) {
	return length(value) && replace(value, /[^A-Za-z0-9_./-]/g, '') == value && match(value, /^[A-Za-z_.]/);
}

function firewall_ipset_family(value) {
	value = dhcp_clean_value(value || 'ipv4');

	if (value == 'any' || value == 'ipv4' || value == 'ipv6')
		return value;

	return null;
}

function firewall_ipset_storage(value) {
	value = dhcp_clean_value(value || '');

	if (value == '' || value == 'bitmap' || value == 'hash' || value == 'list')
		return value;

	return null;
}

function save_firewall_ipsets(rows, allow_empty) {
	rows ||= [];
	allow_empty = allow_empty == true;
	uci.load('firewall');

	let changed = false;
	let config_changed = false;
	let keep = {};
	let existing = {};
	let existing_count = 0;
	let existing_order = [];
	let next_order = [];
	let names = {};

	uci.foreach('firewall', 'ipset', function(section) {
		existing[section['.name']] = true;
		push(existing_order, section['.name']);
		existing_count++;
	});

	if (!length(rows) && existing_count && !allow_empty)
		return {
			saved: false,
			message: 'Refusing to remove all firewall IP sets without confirmation.',
			changed: false,
			ipsets: firewall_ipset_rows(),
			sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
		};

	let validated = [];

	for (let row in rows) {
		let section = dhcp_clean_value(row?.section || '');
		let is_existing = length(section) && uci.get('firewall', section) == 'ipset';
		let match_values = split_dhcp_list(row?.match || '');
		let entry_values = split_dhcp_list(row?.entry || '');
		let family = firewall_ipset_family(row?.family || 'ipv4');
		let storage = firewall_ipset_storage(row?.storage || '');
		let name = dhcp_clean_value(row?.name || '');
		let next = {
			name,
			comment: dhcp_clean_value(row?.comment || ''),
			family,
			maxelem: dhcp_clean_value(row?.maxelem || ''),
			external: dhcp_clean_value(row?.external || ''),
			storage,
			iprange: dhcp_clean_value(row?.iprange || ''),
			portrange: dhcp_clean_value(row?.portrange || ''),
			netmask: dhcp_clean_value(row?.netmask || ''),
			hashsize: dhcp_clean_value(row?.hashsize || ''),
			loadfile: dhcp_clean_value(row?.loadfile || ''),
			timeout: dhcp_clean_value(row?.timeout || ''),
			counters: dhcp_zero_one(row?.counters),
			enabled: dhcp_zero_one(row?.enabled)
		};

		if (!valid_firewall_ipset_name(name))
			return {
				saved: false,
				message: 'Firewall IP set name is required and may contain letters, numbers, dots, dashes, underscores, and slashes.',
				changed: false,
				ipsets: firewall_ipset_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		if (names[name])
			return {
				saved: false,
				message: 'Firewall IP set names must be unique.',
				changed: false,
				ipsets: firewall_ipset_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		names[name] = true;

		if (family == null || storage == null)
			return {
				saved: false,
				message: 'Firewall IP set family or storage value is invalid.',
				changed: false,
				ipsets: firewall_ipset_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		if (!valid_firewall_rule_list(match_values) || !valid_firewall_rule_list(entry_values))
			return {
				saved: false,
				message: 'Firewall IP set match or entry values contain unsupported characters.',
				changed: false,
				ipsets: firewall_ipset_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		for (let key, value in next) {
			if ((key == 'maxelem' || key == 'hashsize' || key == 'timeout') && value != '' && !dhcp_numeric_value(value))
				return {
					saved: false,
					message: 'Firewall IP set numeric fields must be numbers.',
					changed: false,
					ipsets: firewall_ipset_rows(),
					sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
				};

			if ((key == 'external' || key == 'iprange' || key == 'portrange' || key == 'netmask' || key == 'loadfile') && !valid_firewall_rule_value(value))
				return {
					saved: false,
					message: 'Firewall IP set fields contain unsupported characters.',
					changed: false,
					ipsets: firewall_ipset_rows(),
					sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
				};
		}

		push(validated, {
			section,
			is_existing,
			match_values,
			entry_values,
			next
		});
	}

	for (let item in validated) {
		let section = item.section;

		if (!item.is_existing) {
			section = uci.add('firewall', 'ipset');
			changed = true;
			config_changed = true;
		}

		keep[section] = true;
		push(next_order, section);

		let next = item.next;

		for (let key, value in next) {
			let current = uci.get('firewall', section, key) || '';

			if ((key == 'enabled' || key == 'counters') && value == '1' && current == '' && key == 'enabled')
				continue;

			if (current != value) {
				changed = true;
				config_changed = true;

				if ((key == 'enabled' && value == '1') || (key == 'counters' && value == '0') || value == '')
					uci.delete('firewall', section, key);
				else
					uci.set('firewall', section, key, value);
			}
		}

		if (!same_dhcp_list(uci.get('firewall', section, 'match') || [], item.match_values)) {
			changed = true;
			config_changed = true;
			if (length(item.match_values))
				uci.set('firewall', section, 'match', length(item.match_values) == 1 ? item.match_values[0] : item.match_values);
			else
				uci.delete('firewall', section, 'match');
		}

		if (!same_dhcp_list(uci.get('firewall', section, 'entry') || [], item.entry_values)) {
			changed = true;
			config_changed = true;
			if (length(item.entry_values))
				uci.set('firewall', section, 'entry', length(item.entry_values) == 1 ? item.entry_values[0] : item.entry_values);
			else
				uci.delete('firewall', section, 'entry');
		}
	}

	for (let section in existing) {
		if (!keep[section]) {
			uci.delete('firewall', section);
			changed = true;
			config_changed = true;
		}
	}

	let current_order = [];
	for (let section in existing_order)
		if (keep[section])
			push(current_order, section);

	let order_changed = length(current_order) != length(next_order);
	if (!order_changed) {
		for (let i = 0; i < length(next_order); i++) {
			if (current_order[i] != next_order[i]) {
				order_changed = true;
				break;
			}
		}
	}

	if (order_changed)
		changed = true;

	if (changed) {
		if (config_changed)
			uci.commit('firewall');

		if (order_changed) {
			for (let i = 0; i < length(next_order); i++) {
				let section = next_order[i];

				if (replace(section, /[^A-Za-z0-9_.-]/g, '') == section)
					system('uci reorder firewall.' + section + '=' + i + ' >/dev/null 2>&1 || true');
			}

			system('uci commit firewall >/dev/null 2>&1 || true');
		}

		system('/etc/init.d/firewall reload >/dev/null 2>&1 || /etc/init.d/firewall restart >/dev/null 2>&1');
	}

	return {
		saved: true,
		message: changed ? 'Firewall IP sets saved and firewall reloaded.' : 'Firewall IP sets already up to date.',
		changed,
		ipsets: firewall_ipset_rows(),
		sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
	};
}

function firewall_include_file_allowed(path) {
	path = replace(trim('' + (path || '')), /[\r\n]/g, '');

	if (path == '/etc/firewall.user')
		return true;

	let prefix = '/etc/nftables.d/';

	if (substr(path, 0, length(prefix)) != prefix)
		return false;

	let name = substr(path, length(prefix));

	if (length(name) < 5 || index(name, '/') >= 0 || index(name, '..') >= 0)
		return false;

	if (substr(name, length(name) - 4) != '.nft')
		return false;

	return replace(name, /[^A-Za-z0-9_.-]/g, '') == name;
}

function firewall_include_rows() {
	let includes = [];

	try {
		uci.load('firewall');
	}
	catch (e) {
		return includes;
	}

	uci.foreach('firewall', 'include', function(section) {
		let path = section.path || '';

		push(includes, {
			section: section['.name'] || '',
			path,
			type: section.type || '',
			enabled: section.enabled == '0' ? '0' : '1',
			reload: section.reload == '1' ? '1' : '0',
			editable: firewall_include_file_allowed(path)
		});
	});

	return includes;
}

function firewall_include_type(value) {
	value = dhcp_clean_value(value || 'nftables');

	if (value == '' || value == 'nftables' || value == 'script')
		return value || 'nftables';

	return null;
}

function save_firewall_includes(rows) {
	rows ||= [];
	uci.load('firewall');

	let changed = false;
	let keep = {};
	let editable_existing = {};
	let paths = {};

	uci.foreach('firewall', 'include', function(section) {
		let name = section['.name'] || '';

		if (firewall_include_file_allowed(section.path || ''))
			editable_existing[name] = true;
	});

	let validated = [];

	for (let row in rows) {
		let section = dhcp_clean_value(row?.section || '');
		let is_existing = length(section) && uci.get('firewall', section) == 'include' && editable_existing[section];
		let path = replace(trim('' + (row?.path || '')), /[\r\n]/g, '');
		let include_type = firewall_include_type(row?.type || 'nftables');
		let enabled = dhcp_zero_one(row?.enabled);
		let reload = dhcp_zero_one(row?.reload);

		if (!firewall_include_file_allowed(path))
			return {
				saved: false,
				message: 'Firewall include path must be /etc/nftables.d/*.nft or existing /etc/firewall.user.',
				changed: false,
				includes: firewall_include_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		if (include_type == null)
			return {
				saved: false,
				message: 'Firewall include type must be nftables or script.',
				changed: false,
				includes: firewall_include_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		if (paths[path])
			return {
				saved: false,
				message: 'Firewall include paths must be unique.',
				changed: false,
				includes: firewall_include_rows(),
				sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
			};

		paths[path] = true;
		push(validated, { section, is_existing, path, type: include_type, enabled, reload });
	}

	for (let item in validated) {
		let section = item.section;

		if (!item.is_existing) {
			section = uci.add('firewall', 'include');
			changed = true;
		}

		keep[section] = true;

		let next = {
			path: item.path,
			type: item.type,
			enabled: item.enabled,
			reload: item.reload
		};

		for (let key, value in next) {
			let current = uci.get('firewall', section, key) || '';

			if (key == 'enabled' && value == '1' && current == '')
				continue;

			if (key == 'reload' && value == '0' && current == '')
				continue;

			if (current != value) {
				changed = true;

				if ((key == 'enabled' && value == '1') || (key == 'reload' && value == '0') || value == '')
					uci.delete('firewall', section, key);
				else
					uci.set('firewall', section, key, value);
			}
		}
	}

	for (let section in editable_existing) {
		if (!keep[section]) {
			uci.delete('firewall', section);
			changed = true;
		}
	}

	if (changed) {
		uci.commit('firewall');
		system('/etc/init.d/firewall reload >/dev/null 2>&1 || /etc/init.d/firewall restart >/dev/null 2>&1');
	}

	return {
		saved: true,
		message: changed ? 'Firewall includes saved and firewall reloaded.' : 'Firewall includes already up to date.',
		changed,
		includes: firewall_include_rows(),
		sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
	};
}

function firewall_file_allowed(path) {
	path = replace(trim('' + (path || '')), /[\r\n]/g, '');

	if (path == '/etc/firewall.user')
		return {
			title: 'Legacy firewall.user',
			path,
			editable: true
		};

	let prefix = '/etc/nftables.d/';

	if (substr(path, 0, length(prefix)) != prefix)
		return null;

	let name = substr(path, length(prefix));

	if (length(name) < 5 || index(name, '/') >= 0 || index(name, '..') >= 0)
		return null;

	if (substr(name, length(name) - 4) != '.nft')
		return null;

	if (replace(name, /[^A-Za-z0-9_.-]/g, '') != name)
		return null;

	return {
		title: name,
		path,
		editable: true
	};
}

function firewall_file_entry(file) {
	let path = file.path || '';
	let info = stat(path);
	let preview = [];
	let line_count = 0;
	let content = '';
	let quoted = quote_command_args([path])[0];

	if (info?.type == 'file') {
		line_count = int(trim(shell_output(`wc -l < ${quoted}`)) || 0);
		preview = split(trim(shell_output(`sed -n '1,20p' ${quoted}`)), '\n');

		if (info.size <= 131072)
			content = readfile(path) || '';
	}

	if (length(preview) == 1 && !length(preview[0]))
		preview = [];

	return {
		title: file.title || path,
		path,
		exists: info?.type == 'file',
		size: info?.size || 0,
		lines: line_count,
		preview,
		editable: !!file.editable,
		content
	};
}

function firewall_files() {
	let files = [];
	let seen = {};

	let legacy = firewall_file_allowed('/etc/firewall.user');
	push(files, legacy);
	seen[legacy.path] = true;

	for (let path in glob('/etc/nftables.d/*.nft')) {
		let file = firewall_file_allowed(path);

		if (file && !seen[file.path]) {
			push(files, file);
			seen[file.path] = true;
		}
	}

	sort(files, function(a, b) {
		return a.path > b.path ? 1 : -1;
	});

	return map(files, firewall_file_entry);
}

function save_firewall_file(path, text) {
	path = replace(trim('' + (path || '')), /[\r\n]/g, '');
	text = '' + (text || '');

	if (length(text) > 131072)
		return {
			saved: false,
			message: 'Firewall file is too large.',
			changed: false,
			file: null
		};

	let file = firewall_file_allowed(path);

	if (!file)
		return {
			saved: false,
			message: 'Firewall file is not editable from I Love LuCI.',
			changed: false,
			file: null
		};

	let current = readfile(path) || '';
	let changed = current != text;

	if (changed) {
		writefile(path, text);
		system('/etc/init.d/firewall reload >/dev/null 2>&1 || /etc/init.d/firewall restart >/dev/null 2>&1 || true');
	}

	return {
		saved: true,
		message: changed ? 'Firewall file saved and firewall reloaded.' : 'Firewall file already up to date.',
		changed,
		file: firewall_file_entry(file)
	};
}

function run_init_action(name, action) {
	name = safe_init_name(name);
	action = action || 'status';

	if (!name || !initActions[action])
		return {
			ok: false,
			message: 'Unsupported init action.',
			state: null
		};

	let script = `/etc/init.d/${name}`;

	if (stat(script)?.type != 'file')
		return {
			ok: false,
			message: 'Init script was not found.',
			state: null
		};

	let exit_code = 0;

	if (action != 'status')
		exit_code = system(`${script} ${action} >/dev/null 2>&1`);

	return {
		ok: exit_code == 0,
		message: exit_code == 0 ? `Action ${action} completed.` : `Action ${action} failed.`,
		state: fast_service_state(name)
	};
}

function startup_entries() {
	let entries = [];
	let enabled = {};
	let running = {};
	let service_list = ubus.call('service', 'list') || {};

	for (let path in glob('/etc/rc.d/S*')) {
		let parts = split(path, '/');
		let name = replace(parts[length(parts) - 1], /^S[0-9]+/, '');
		enabled[name] = true;
	}

	for (let name, service in service_list) {
		for (let instance_name, instance in service?.instances || {}) {
			if (instance?.running) {
				running[name] = true;
				break;
			}
		}
	}

	for (let script in glob('/etc/init.d/*')) {
		let parts = split(script, '/');
		let name = parts[length(parts) - 1];

		push(entries, {
			name,
			enabled: enabled[name] || false,
			running: running[name] || false
		});
	}

	sort(entries, function(a, b) {
		return a.name > b.name ? 1 : -1;
	});

	return entries;
}

function service_overview() {
	let services = [];

	for (let id, meta in servicePackages) {
		push(services, {
			id,
			title: meta.title,
			package: meta.package,
			compatPath: meta.compatPath || null,
			init: fast_service_state(meta.init),
			sections: collect_uci_config(meta.package, meta.sections || [])
		});
	}

	return services;
}

function custom_command_entries() {
	let entries = [];

	try {
		uci.load('luci');
	}
	catch (e) {
		return entries;
	}

	uci.foreach('luci', 'command', function(section) {
		push(entries, {
			id: section['.name'],
			name: section.name || section['.name'],
			command: section.command || '',
			param: section.param == '1',
			public: section.public == '1'
		});
	});

	return entries;
}

function custom_command_section(id) {
	let result = null;

	id = '' + (id || '');

	if (!length(id) || replace(id, /[^A-Za-z0-9_.-]/g, '') != id)
		return null;

	try {
		uci.load('luci');
	}
	catch (e) {
		return null;
	}

	uci.foreach('luci', 'command', function(section) {
		if (section['.name'] == id)
			result ??= section;
	});

	return result;
}

function valid_custom_command_id(value) {
	return length(value) && replace(value, /[^A-Za-z0-9_.-]/g, '') == value;
}

function clean_custom_command_value(value) {
	value = trim('' + (value || ''));
	return replace(value, /[\r\n]/g, '');
}

function valid_custom_command_text(value) {
	return value == '' || replace(value, /[\r\n]/g, '') == value;
}

function save_custom_commands(rows) {
	rows ||= [];
	uci.load('luci');

	let changed = false;
	let keep = {};
	let existing = {};
	let validated = [];

	uci.foreach('luci', 'command', function(section) {
		existing[section['.name']] = true;
	});

	for (let row in rows) {
		let section = clean_custom_command_value(row?.id || '');
		let is_existing = length(section) && uci.get('luci', section) == 'command';
		let next = {
			name: clean_custom_command_value(row?.name || section),
			command: clean_custom_command_value(row?.command || ''),
			param: row?.param ? '1' : '0',
			public: row?.public ? '1' : '0'
		};

		if (length(section) && !valid_custom_command_id(section))
			return {
				saved: false,
				message: 'Command id may contain only letters, numbers, dots, dashes, and underscores.',
				changed: false,
				commands: custom_command_entries(),
				sections: collect_uci_config('luci', ['command'])
			};

		if (!length(next.name) || !length(next.command))
			return {
				saved: false,
				message: 'Command name and command are required.',
				changed: false,
				commands: custom_command_entries(),
				sections: collect_uci_config('luci', ['command'])
			};

		if (!valid_custom_command_text(next.name) || !valid_custom_command_text(next.command))
			return {
				saved: false,
				message: 'Command fields may not contain newlines.',
				changed: false,
				commands: custom_command_entries(),
				sections: collect_uci_config('luci', ['command'])
			};

		push(validated, {
			section,
			is_existing,
			next
		});
	}

	for (let item in validated) {
		let section = item.section;

		if (!item.is_existing) {
			section = uci.add('luci', 'command');
			changed = true;
		}

		keep[section] = true;

		for (let key, value in item.next) {
			let current = uci.get('luci', section, key) || '';

			if ((key == 'param' || key == 'public') && value == '0' && current == '')
				continue;

			if (current != value) {
				changed = true;
				if ((key == 'param' || key == 'public') && value == '0')
					uci.delete('luci', section, key);
				else
					uci.set('luci', section, key, value);
			}
		}
	}

	for (let section in existing) {
		if (!keep[section]) {
			uci.delete('luci', section);
			changed = true;
		}
	}

	if (changed)
		uci.commit('luci');

	return {
		saved: true,
		message: changed ? 'Custom commands saved.' : 'Custom commands already up to date.',
		changed,
		commands: custom_command_entries(),
		sections: collect_uci_config('luci', ['command'])
	};
}

function run_custom_command(id, args) {
	let section = custom_command_section(id);

	if (!section?.command)
		return {
			ok: false,
			message: 'No such command.',
			command: '',
			stdout: '',
			stderr: '',
			exitcode: 127,
			binary: false
		};

	args = '' + (args || '');

	if (length(args) > 4096)
		return {
			ok: false,
			message: 'Command arguments are too large.',
			command: '',
			stdout: '',
			stderr: '',
			exitcode: 1,
			binary: false
		};

	let argv = parse_command_args(section.command);

	if (section.param == '1' && length(args))
		push(argv, ...(parse_command_args(args) ?? []));

	if (!length(argv))
		return {
			ok: false,
			message: 'Command is empty.',
			command: '',
			stdout: '',
			stderr: '',
			exitcode: 127,
			binary: false
		};

	let quoted = quote_command_args(argv);
	let outfd = mkstemp();
	let errfd = mkstemp();
	let exitcode = system(`${join(' ', quoted)} >&${outfd.fileno()} 2>&${errfd.fileno()}`);

	outfd.seek(0);
	errfd.seek(0);

	let stdout = outfd.read(1024 * 512) || '';
	let stderr = errfd.read(1024 * 512) || '';
	let binary = contains_binary(stdout);

	outfd.close();
	errfd.close();

	return {
		ok: true,
		message: exitcode == 0 ? 'Command completed.' : 'Command failed.',
		command: join(' ', quoted),
		stdout: binary ? '' : stdout,
		stderr,
		exitcode,
		binary
	};
}

function package_list() {
	let output = command_exists('apk')
		? shell_output('apk info -vv | sort | head -n 300')
		: shell_output('opkg list-installed | sort | head -n 300');

	return split(trim(output), '\n');
}

function package_available_list() {
	let output = command_exists('apk')
		? shell_output('apk search -v 2>&1 | sort | sed -n "1,320p"')
		: shell_output('opkg list 2>&1 | sort | sed -n "1,320p"');
	let rows = [];

	for (let line in split(trim(output), '\n')) {
		line = trim(line);

		if (!length(line) || substr(line, 0, 8) == 'WARNING:')
			continue;

		push(rows, line);

		if (length(rows) >= 300)
			break;
	}

	return rows;
}

function package_upgrades() {
	if (command_exists('apk'))
		return shell_output('apk version -l "<" 2>&1 | sed -n "1,160p"');

	return shell_output('opkg list-upgradable 2>&1 | sed -n "1,160p"');
}

function package_feed_files() {
	if (command_exists('apk'))
		return [
			'/etc/apk/repositories',
			'/etc/apk/repositories.d/distfeeds.list',
			'/etc/apk/repositories.d/customfeeds.list'
		];

	return [
		'/etc/opkg.conf',
		'/etc/opkg/customfeeds.conf',
		'/etc/opkg/distfeeds.conf'
	];
}

function package_feed_file_allowed(path) {
	path = replace(trim('' + (path || '')), /[\r\n]/g, '');

	for (let allowed in package_feed_files())
		if (path == allowed)
			return path;

	return null;
}

function package_feed_rows() {
	let rows = [];

	for (let path in package_feed_files()) {
		let info = stat(path);

		if (info?.type != 'file')
			continue;

		let text = readfile(path) || '';
		let index = 0;

		for (let line in split(text, '\n')) {
			if (index == length(split(text, '\n')) - 1 && line == '')
				break;

			let trimmed = trim(line);
			let enabled = true;
			let value = trimmed;
			let type = 'repository';

			if (trimmed == '') {
				type = 'blank';
				value = '';
			}
			else if (substr(trimmed, 0, 1) == '#') {
				enabled = false;
				value = trim(substr(trimmed, 1));

				if (!match(value, /^(https?:\/\/|ftp:\/\/|file:\/\/|\/).+/))
					type = 'comment';
			}
			else if (!match(value, /^(https?:\/\/|ftp:\/\/|file:\/\/|\/).+/)) {
				type = 'comment';
			}

			push(rows, {
				id: `${path}:${index}`,
				file: path,
				index,
				type,
				enabled,
				value,
				raw: line
			});

			index++;
		}
	}

	return rows;
}

function package_feed_line(row) {
	let type = row?.type || 'repository';
	let value = replace(trim('' + (row?.value || '')), /[\r\n]/g, '');
	let raw = '' + (row?.raw || '');

	if (type == 'blank')
		return '';

	if (type == 'comment') {
		if (length(raw) && substr(trim(raw), 0, 1) == '#')
			return raw;

		return length(value) ? `# ${value}` : '#';
	}

	if (!match(value, /^(https?:\/\/|ftp:\/\/|file:\/\/|\/).+/) || replace(value, /[\r\n\t ]/g, '') != value)
		return null;

	return row?.enabled ? value : `# ${value}`;
}

function save_package_feeds(rows) {
	rows ||= [];

	let grouped = {};
	let seen = {};

	for (let path in package_feed_files())
		grouped[path] = [];

	for (let row in rows) {
		let file = package_feed_file_allowed(row?.file || '');

		if (!file)
			return {
				saved: false,
				message: 'Package feed file is not editable from I Love LuCI.',
				changed: false,
				feeds: package_feed_rows()
			};

		let line = package_feed_line(row);

		if (line === null)
			return {
				saved: false,
				message: 'Package feed URL contains unsupported characters.',
				changed: false,
				feeds: package_feed_rows()
			};

		push(grouped[file], line);
		seen[file] = true;
	}

	let changed = false;

	for (let file, lines in grouped) {
		if (!seen[file] && stat(file)?.type != 'file')
			continue;

		let next = join('\n', lines);

		if (length(next))
			next += '\n';

		let current = readfile(file) || '';

		if (current != next) {
			writefile(file, next);
			changed = true;
		}
	}

	return {
		saved: true,
		message: changed ? 'Package feed configuration saved.' : 'Package feed configuration already up to date.',
		changed,
		feeds: package_feed_rows()
	};
}

function attendedsysupgrade_sections() {
	return collect_uci_config('attendedsysupgrade', ['server', 'client', 'owut']);
}

function valid_attendedsysupgrade_url(value) {
	return length(value) && replace(value, /[^A-Za-z0-9_./:?=&%#@+~,;!$*'()[\\]-]/g, '') == value;
}

function save_attendedsysupgrade_config(config) {
	config ||= {};
	uci.load('attendedsysupgrade');

	let server = null;
	let client = null;

	uci.foreach('attendedsysupgrade', 'server', function(section) {
		server ??= section['.name'];
	});
	uci.foreach('attendedsysupgrade', 'client', function(section) {
		client ??= section['.name'];
	});

	server ||= uci.add('attendedsysupgrade', 'server');
	client ||= uci.add('attendedsysupgrade', 'client');

	let url = replace(trim('' + (config.server_url || '')), /[\r\n]/g, '');
	let rebuilders = split_dhcp_lines(config.rebuilder || '');

	if (!valid_attendedsysupgrade_url(url))
		return {
			saved: false,
			message: 'Attended sysupgrade build server URL is required.',
			changed: false,
			sections: attendedsysupgrade_sections()
		};

	for (let rebuilder in rebuilders)
		if (!valid_attendedsysupgrade_url(rebuilder))
			return {
				saved: false,
				message: 'Attended sysupgrade rebuilder URL contains unsupported characters.',
				changed: false,
				sections: attendedsysupgrade_sections()
			};

	let client_options = {
		upgrade_packages: ('' + config.upgrade_packages) == '1' ? '1' : '0',
		auto_search: ('' + config.auto_search) == '1' ? '1' : '0',
		advanced_mode: ('' + config.advanced_mode) == '1' ? '1' : '0',
		login_check_for_upgrades: ('' + config.login_check_for_upgrades) == '1' ? '1' : '0'
	};
	let changed = false;

	if ((uci.get('attendedsysupgrade', server, 'url') || '') != url) {
		changed = true;
		uci.set('attendedsysupgrade', server, 'url', url);
	}

	if (!same_dhcp_list(uci.get('attendedsysupgrade', server, 'rebuilder') || [], rebuilders)) {
		changed = true;
		if (length(rebuilders))
			uci.set('attendedsysupgrade', server, 'rebuilder', length(rebuilders) == 1 ? rebuilders[0] : rebuilders);
		else
			uci.delete('attendedsysupgrade', server, 'rebuilder');
	}

	for (let key, value in client_options) {
		if ((uci.get('attendedsysupgrade', client, key) || '') != value) {
			changed = true;
			uci.set('attendedsysupgrade', client, key, value);
		}
	}

	if (changed)
		uci.commit('attendedsysupgrade');

	return {
		saved: true,
		message: changed ? 'Attended sysupgrade settings saved.' : 'Attended sysupgrade settings already up to date.',
		changed,
		sections: attendedsysupgrade_sections()
	};
}

function attendedsysupgrade_helper_status() {
	if (command_exists('owut'))
		return trim(shell_output('owut --version 2>&1 || owut --help 2>&1 | sed -n "1,80p"'));

	if (command_exists('auc'))
		return trim(shell_output('auc --help 2>&1 | sed -n "1,80p"'));

	return 'owut and auc are not installed.';
}

function attendedsysupgrade_plan(action) {
	action = trim('' + (action || 'check'));

	let allowed = {
		check: 'Check for upgrade',
		list: 'List build packages',
		blob: 'Build request payload'
	};

	if (!allowed[action])
		return {
			ok: false,
			helper: command_exists('owut') ? 'owut' : (command_exists('auc') ? 'auc' : 'none'),
			action,
			command: '',
			output: '',
			lines: [],
			warnings: [],
			message: 'Unsupported attended sysupgrade planning action.'
		};

	if (!command_exists('owut'))
		return {
			ok: false,
			helper: command_exists('auc') ? 'auc' : 'none',
			action,
			command: '',
			output: '',
			lines: [],
			warnings: [],
			message: 'owut is not installed. Use LuCI compat for attended sysupgrade actions on this router.'
		};

	let command = 'owut ' + action;
	let board = ubus.call('system', 'board') || {};
	let release = board.release || {};
	let sections = attendedsysupgrade_sections();
	let server_url = '';
	let package_source = command_exists('apk') ? '/etc/apk/world' : 'opkg user package state';
	let package_lines = command_exists('apk')
		? split_lines(shell_output('sed -n "1,120p" /etc/apk/world 2>/dev/null'))
		: split_lines(shell_output("opkg list-installed 2>/dev/null | sed -n '1,120p'"));

	for (let section in sections)
		if (section.type == 'server' && !length(server_url))
			server_url = section.values?.url || '';

	let lines = [
		`Prepared command: ${command}`,
		`ASU server: ${server_url || 'default owut server'}`,
		`Current firmware: ${release.description || 'unknown'}`,
		`Target: ${release.target || 'unknown'}`,
		`Profile: ${board.board_name || board.model || 'unknown'}`
	];
	let warnings = [
		'Live owut check/list/blob execution is intentionally left to LuCI compat because it can exceed ubus/rpcd request timeouts.'
	];

	if (action == 'list') {
		push(lines, `Package source: ${package_source}`);
		for (let line in package_lines)
			push(lines, `Package: ${line}`);
	}
	else if (action == 'blob') {
		push(lines, `Package source: ${package_source}`);
		push(lines, 'Build request generation remains delegated to owut/LuCI compat until long-running ASU jobs have a background job/progress RPC.');
		for (let line in package_lines)
			push(lines, `Package candidate: ${line}`);
	}
	else {
		push(lines, 'Live compatibility check remains delegated to owut/LuCI compat until background job/progress handling exists.');
	}

	let output = join('\n', lines);

	return {
		ok: true,
		helper: 'owut',
		action,
		command,
		output,
		lines,
		warnings,
		message: `${allowed[action]} prepared without router changes.`
	};
}

function attendedsysupgrade_job_id() {
	let value = trim(shell_output(`dd if=/dev/urandom bs=8 count=1 2>/dev/null | hexdump -ve '1/1 "%02x"'`));
	if (!length(value))
		value = trim(shell_output('date +%s')) + '-' + trim(shell_output('echo $$'));
	return replace(value, /[^A-Za-z0-9_.-]/g, '');
}

function valid_attendedsysupgrade_job_id(id) {
	id = trim('' + (id || ''));
	return length(id) > 0 && length(id) <= 80 && replace(id, /[^A-Za-z0-9_.-]/g, '') == id;
}

function attendedsysupgrade_job_paths(id) {
	return {
		meta: '/tmp/i-love-luci-asu-job-' + id + '.json',
		output: '/tmp/i-love-luci-asu-job-' + id + '.log',
		rc: '/tmp/i-love-luci-asu-job-' + id + '.rc'
	};
}

function attendedsysupgrade_live_plan(action, output, code, done) {
	action = trim('' + (action || 'check'));
	output = '' + (output || '');
	let ok = done && code == 0;
	let lines = split_lines(output);
	let warnings = [];

	for (let line in lines) {
		line = trim(line);
		if (substr(line, 0, 8) != 'WARNING:')
			continue;

		let seen = false;
		for (let warning in warnings)
			if (warning == line)
				seen = true;
		if (!seen)
			push(warnings, line);
	}

	return {
		ok,
		helper: command_exists('owut') ? 'owut' : (command_exists('auc') ? 'auc' : 'none'),
		action,
		command: command_exists('owut') ? 'owut ' + action : '',
		output,
		lines,
		warnings,
		message: done ? (ok ? 'Attended sysupgrade planning complete.' : 'Attended sysupgrade planning failed.') : 'Attended sysupgrade planning running.'
	};
}

let attendedsysupgrade_job_status;

function attendedsysupgrade_job_output(path) {
	if (stat(path)?.type != 'file')
		return '';

	let output_quoted = quote_command_args([path])[0];
	return shell_output(`sed -n "1,260p" ${output_quoted}`);
}

function attendedsysupgrade_job_start(action) {
	action = trim('' + (action || 'check'));
	let allowed = {
		check: true,
		list: true,
		blob: true
	};

	if (!allowed[action] || !command_exists('owut'))
		return {
			started: false,
			job: null,
			result: attendedsysupgrade_plan(action)
		};

	let id = attendedsysupgrade_job_id();
	let paths = attendedsysupgrade_job_paths(id);
	let command = 'owut ' + action;
	let meta = {
		id,
		action,
		helper: 'owut',
		command,
		startedAt: trim(shell_output('date +%s'))
	};
	let output_quoted = quote_command_args([paths.output])[0];
	let rc_quoted = quote_command_args([paths.rc])[0];
	let command_quoted = quote_command_args([command])[0];

	writefile(paths.meta, sprintf('%J', meta));
	system(`(sh -c ${command_quoted} >${output_quoted} 2>&1; echo $? >${rc_quoted}) >/dev/null 2>&1 &`);

	return {
		started: true,
		job: attendedsysupgrade_job_status(id),
		result: null
	};
}

attendedsysupgrade_job_status = function(id) {
	if (!valid_attendedsysupgrade_job_id(id))
		return {
			id,
			running: false,
			done: true,
			result: attendedsysupgrade_live_plan('check', 'Attended sysupgrade job id is invalid.', 1, true)
		};

	let paths = attendedsysupgrade_job_paths(id);
	let meta = read_jsonfile(paths.meta, null);

	if (!meta)
		return {
			id,
			running: false,
			done: true,
			result: attendedsysupgrade_live_plan('check', 'Attended sysupgrade job was not found.', 1, true)
		};

	let rc_text = trim(readfile(paths.rc) || '');
	let done = length(rc_text) > 0;
	let code = done ? +rc_text : null;
	let output = attendedsysupgrade_job_output(paths.output);

	return {
		id,
		running: !done,
		done,
		result: attendedsysupgrade_live_plan(meta.action || 'check', output, code, done)
	};
};

function package_search(query) {
	query = trim('' + (query || ''));

	if (!length(query))
		return {
			query,
			manager: command_exists('apk') ? 'apk' : 'opkg',
			lines: [],
			warnings: [],
			message: 'Enter a package name or description to search.'
		};

	if (length(query) > 80)
		query = substr(query, 0, 80);

	let manager = command_exists('apk') ? 'apk' : 'opkg';
	let argv = manager == 'apk'
		? ['apk', 'search', '-v', query]
		: ['opkg', 'list', `*${query}*`];
	let output = trim(shell_output(`${join(' ', quote_command_args(argv))} | sed -n "1,220p"`));
	let lines = [];
	let warnings = [];

	for (let line in split(output, '\n')) {
		line = trim(line);

		if (!length(line))
			continue;

		if (substr(line, 0, 8) == 'WARNING:')
			push(warnings, line);
		else
			push(lines, line);
	}

	return {
		query,
		manager,
		lines,
		warnings,
		message: length(lines) ? 'Package search complete.' : 'No packages matched the search.'
	};
}

function unique_push(list, value) {
	value = trim('' + (value || ''));
	if (!length(value))
		return;

	for (let item in list)
		if (item == value)
			return;

	push(list, value);
}

function valid_package_name(name) {
	return length(name) > 0 && length(name) <= 120 && replace(name, /[^A-Za-z0-9_.+:-]/g, '') == name;
}

function staged_package_path(name) {
	name = trim('' + (name || ''));

	if (match(name, /^\/tmp\/i-love-luci-package-[A-Za-z0-9_.-]+\.(apk|ipk)$/))
		return name;

	return '';
}

function package_detail(name) {
	name = trim('' + (name || ''));
	let manager = command_exists('apk') ? 'apk' : 'opkg';
	let detail = {
		ok: false,
		manager,
		name,
		installed: false,
		version: '',
		description: '',
		webpage: '',
		installedSize: '',
		license: '',
		dependencies: [],
		provides: [],
		requiredBy: [],
		files: [],
		warnings: [],
		message: 'Package detail is unavailable.'
	};

	if (!valid_package_name(name)) {
		detail.message = 'Package name contains unsupported characters.';
		return detail;
	}

	let quoted = quote_command_args([name])[0];

	if (manager == 'apk') {
		let exact = trim(shell_output(`apk info -e ${quoted} 2>/dev/null | sed -n "1p"`));
		let output = shell_output(`apk info -a ${quoted} 2>&1 | sed -n "1,420p"`);
		let current = '';

		detail.installed = length(exact) > 0;

		for (let raw_line in split(output, '\n')) {
			let line = trim(raw_line);

			if (!length(line)) {
				current = '';
				continue;
			}

			if (substr(line, 0, 8) == 'WARNING:') {
				unique_push(detail.warnings, line);
				continue;
			}

			let header = match(line, /^(.+) (description|webpage|installed size|depends on|provides|is required by|contains|license):$/);
			if (header) {
				let pkgver = header[1];
				let active = false;
				let suffix = '';

				if (index(pkgver, name + '-') == 0)
					suffix = substr(pkgver, length(name) + 1);

				if (length(exact) && index(exact, name + '-') == 0)
					active = pkgver == exact;
				else if (length(suffix))
					active = match(suffix, /^[0-9]/) ? true : false;

				current = active ? header[2] : 'skip';

				if (active && length(suffix) && !length(detail.version))
					detail.version = suffix;

				continue;
			}

			if (current == 'description' && !length(detail.description))
				detail.description = line;
			else if (current == 'webpage' && !length(detail.webpage))
				detail.webpage = line;
			else if (current == 'installed size' && !length(detail.installedSize))
				detail.installedSize = line;
			else if (current == 'license' && !length(detail.license))
				detail.license = line;
			else if (current == 'depends on')
				unique_push(detail.dependencies, line);
			else if (current == 'provides')
				unique_push(detail.provides, line);
			else if (current == 'is required by')
				unique_push(detail.requiredBy, line);
			else if (current == 'contains')
				unique_push(detail.files, line);
		}
	}
	else {
		let output = shell_output(`opkg info ${quoted} 2>&1 | sed -n "1,260p"`);

		for (let raw_line in split(output, '\n')) {
			let line = trim(raw_line);

			if (!length(line))
				continue;

			if (substr(line, 0, 8) == 'Unknown ' || substr(line, 0, 7) == 'Cannot ') {
				unique_push(detail.warnings, line);
				continue;
			}

			let field = match(line, /^([A-Za-z0-9 -]+):\s*(.*)$/);
			if (!field)
				continue;

			let key = field[1];
			let value = field[2];

			if (key == 'Package')
				detail.installed = value == name;
			else if (key == 'Version' && !length(detail.version))
				detail.version = value;
			else if (key == 'Description' && !length(detail.description))
				detail.description = value;
			else if (key == 'Homepage' && !length(detail.webpage))
				detail.webpage = value;
			else if (key == 'Installed-Size' && !length(detail.installedSize))
				detail.installedSize = value;
			else if (key == 'License' && !length(detail.license))
				detail.license = value;
			else if (key == 'Depends')
				for (let dependency in split(value, ','))
					unique_push(detail.dependencies, dependency);
			else if (key == 'Provides')
				for (let provided in split(value, ','))
					unique_push(detail.provides, provided);
		}

		let files = shell_output(`opkg files ${quoted} 2>/dev/null | sed -n "2,180p"`);
		for (let line in split(files, '\n'))
			unique_push(detail.files, line);
	}

	detail.ok = length(detail.version) > 0 || detail.installed || length(detail.dependencies) > 0 || length(detail.description) > 0;
	detail.message = detail.ok ? 'Package detail loaded.' : 'Package detail was not found.';

	return detail;
}

function package_i18n_base(name) {
	if (index(name, 'luci-app-') == 0)
		return substr(name, length('luci-app-'));

	if (index(name, 'luci-mod-') == 0)
		return substr(name, length('luci-mod-'));

	if (name == 'luci-base')
		return 'base';

	return '';
}

function package_i18n_suggestions(name) {
	name = trim('' + (name || ''));
	let manager = command_exists('apk') ? 'apk' : 'opkg';
	let language = '';

	uci.load('luci');
	language = uci.get('luci', 'main', 'lang') || '';

	let result = {
		ok: false,
		manager,
		name,
		language,
		prefix: '',
		lines: [],
		warnings: [],
		message: 'No translation package suggestions.'
	};

	if (!valid_package_name(name)) {
		result.message = 'Package name contains unsupported characters.';
		return result;
	}

	let base = package_i18n_base(name);
	if (!length(base)) {
		result.message = 'Translation suggestions apply to LuCI packages.';
		return result;
	}

	result.prefix = 'luci-i18n-' + base + '-';
	let query = result.prefix + '*';
	let argv = manager == 'apk'
		? ['apk', 'search', '-v', query]
		: ['opkg', 'list', query];
	let output = shell_output(`${join(' ', quote_command_args(argv))} 2>&1 | sed -n "1,120p"`);

	for (let raw_line in split(output, '\n')) {
		let line = trim(raw_line);

		if (!length(line))
			continue;

		if (substr(line, 0, 8) == 'WARNING:')
			unique_push(result.warnings, line);
		else
			unique_push(result.lines, line);
	}

	result.ok = true;
	result.message = length(result.lines) ? 'Translation suggestions loaded.' : 'No translation packages matched this LuCI package.';

	return result;
}

function remote_package_url(name) {
	return (substr(name, 0, 7) == 'http://' || substr(name, 0, 8) == 'https://') && replace(name, /[^A-Za-z0-9._~:\/?#=@&%+;,!$()*-]/g, '') == name;
}

function remote_package_install_command(manager, url, allow_untrusted, overwrite) {
	let url_quoted = quote_command_args([url])[0];
	let base_argv = [];

	if (manager == 'apk') {
		base_argv = ['apk', 'add'];
		if (allow_untrusted)
			push(base_argv, '--allow-untrusted');
		if (overwrite)
			push(base_argv, '--force-overwrite');
	}
	else {
		base_argv = ['opkg'];
		if (overwrite)
			push(base_argv, '--force-overwrite');
		push(base_argv, 'install');
	}

	let install_command = join(' ', quote_command_args(base_argv)) + ' "$tmp"';

	return `tmp=$(mktemp /tmp/i-love-luci-package-url.XXXXXX); rc=$?; if [ "$rc" -eq 0 ]; then (uclient-fetch -q -T 8 -O "$tmp" ${url_quoted} || wget -q -T 8 -O "$tmp" ${url_quoted} || curl -fsSL --connect-timeout 8 --max-time 20 -o "$tmp" ${url_quoted}); rc=$?; if [ "$rc" -eq 0 ]; then ${install_command}; rc=$?; else echo 'Package URL download failed.'; fi; fi; rm -f "$tmp"; test "$rc" -eq 0`;
}

function valid_package_reference(name, simulate, allow_remote) {
	if (valid_package_name(name))
		return true;

	if (length(name) <= 0 || length(name) > 2048)
		return false;

	if (!simulate && !allow_remote)
		return length(staged_package_path(name)) > 0;

	if (length(staged_package_path(name)))
		return true;

	if ((simulate || allow_remote) && remote_package_url(name))
		return true;

	if (match(name, /^\/tmp\/[A-Za-z0-9._+-]+\.(apk|ipk)$/))
		return true;

	return false;
}

function package_safe_filename(value) {
	value = replace(trim('' + (value || 'package.apk')), /[^A-Za-z0-9_.-]/g, '-');
	return length(value) ? value : 'package.apk';
}

function package_file_stage(filename, data) {
	filename = package_safe_filename(filename || 'package.apk');

	if (!match(filename, /\.(apk|ipk)$/))
		return {
			ok: false,
			message: 'Package upload must be an .apk or .ipk file.',
			filename,
			path: '',
			size: 0,
			checksum: '',
			sha256sum: ''
		};

	if (length('' + (data || '')) > 24 * 1024 * 1024)
		return {
			ok: false,
			message: 'Package file exceeds the native upload limit.',
			filename,
			path: '',
			size: 0,
			checksum: '',
			sha256sum: ''
		};

	let decoded = base64_decode(data);
	let size = length(decoded);

	if (!size)
		return {
			ok: false,
			message: 'Package file is empty or invalid.',
			filename,
			path: '',
			size: 0,
			checksum: '',
			sha256sum: ''
		};

	if (size > 16 * 1024 * 1024)
		return {
			ok: false,
			message: 'Package file exceeds the native upload limit.',
			filename,
			path: '',
			size,
			checksum: '',
			sha256sum: ''
		};

	let path = '/tmp/i-love-luci-package-' + filename;
	let quoted = quote_command_args([path])[0];

	writefile(path, decoded);
	system(`chmod 0600 ${quoted} >/dev/null 2>&1 || true`);

	return {
		ok: true,
		message: 'Package file staged for install planning.',
		filename,
		path,
		size,
		checksum: trim(shell_output(`md5sum ${quoted} 2>/dev/null | awk '{print $1}'`)),
		sha256sum: trim(shell_output(`sha256sum ${quoted} 2>/dev/null | awk '{print $1}'`))
	};
}

function package_action_plan(action, name, simulate, options) {
	action = trim('' + (action || ''));
	name = trim('' + (name || ''));
	simulate = !!simulate;
	options ||= {};

	let manager = command_exists('apk') ? 'apk' : 'opkg';
	let argv = [];
	let command = '';
	let overwrite = !!options.overwrite;
	let autoremove = !!options.autoremove;
	let allow_untrusted = !!options.allowUntrusted;
	let allow_remote = !!options.allowRemote;
	let i18n = [];
	let staged_path = staged_package_path(name);
	let is_staged = length(staged_path) > 0;
	let is_remote = remote_package_url(name);

	for (let pkg in (options.i18nPackages || [])) {
		pkg = trim('' + pkg);
		if (valid_package_name(pkg))
			push(i18n, pkg);
	}

	if (action == 'update') {
		argv = manager == 'apk' ? ['apk', 'update'] : ['opkg', 'update'];
		name = '';
		simulate = false;
	}
	else if (action == 'install' || action == 'remove' || action == 'upgrade') {
		if (action == 'upgrade' && simulate && !length(name)) {
			argv = manager == 'apk' ? ['apk', 'upgrade', '--simulate'] : ['opkg', '--noaction', 'upgrade'];
		}
		else if (action == 'upgrade' && !simulate)
			return {
				ok: false,
				manager,
				action,
				name,
				simulate,
				command: '',
				output: '',
				message: 'Package upgrade apply stays in LuCI compat until rollback parity is complete.'
			};
		else if (action == 'remove' && !valid_package_name(name))
			return {
				ok: false,
				manager,
				action,
				name,
				simulate,
				command: '',
				output: '',
				message: 'Package removal requires a package name.'
			};
		else if (!valid_package_reference(name, simulate, allow_remote))
			return {
				ok: false,
				manager,
				action,
				name,
				simulate,
				command: '',
				output: '',
				message: 'Package name contains unsupported characters.'
			};
		else if (!simulate && action == 'install' && !valid_package_name(name) && !is_staged && !is_remote)
			return {
				ok: false,
				manager,
				action,
				name,
				simulate,
				command: '',
				output: '',
				message: 'Package install source must be a package name, staged package file, or allowed URL.'
			};
		else if (manager == 'apk') {
			if (action == 'install') {
				if (!simulate && is_remote) {
					command = remote_package_install_command(manager, name, allow_untrusted, overwrite);
				}
				else {
					argv = ['apk', 'add'];
					if (simulate)
						push(argv, '--simulate');
					if (!simulate && is_staged && allow_untrusted)
						push(argv, '--allow-untrusted');
					if (overwrite)
						push(argv, '--force-overwrite');
					for (let pkg in i18n)
						push(argv, pkg);
					push(argv, name);
				}
			}
			else if (action == 'remove') {
				argv = ['apk', 'del'];
				if (simulate)
					push(argv, '--simulate');
				push(argv, name);
			}
			else
				argv = ['apk', 'add', '--simulate', '--upgrade', name];
		}
		else {
			if (action == 'install') {
				if (!simulate && is_remote) {
					command = remote_package_install_command(manager, name, allow_untrusted, overwrite);
				}
				else {
					argv = ['opkg'];
					if (simulate)
						push(argv, '--noaction');
					if (overwrite)
						push(argv, '--force-overwrite');
					push(argv, 'install');
					for (let pkg in i18n)
						push(argv, pkg);
					push(argv, name);
				}
			}
			else if (action == 'remove') {
				argv = ['opkg'];
				if (simulate)
					push(argv, '--noaction');
				if (autoremove)
					push(argv, '--autoremove');
				push(argv, 'remove', name);
			}
			else
				argv = ['opkg', '--noaction', 'upgrade', name];
		}
	}
	else {
		return {
			ok: false,
			manager,
			action,
			name,
			simulate,
			command: '',
			output: '',
			message: 'Unsupported package action.'
		};
	}

	if (length(staged_path) || (simulate && match(name, /^\/tmp\/[A-Za-z0-9._+-]+\.(apk|ipk)$/))) {
		let staged = stat(name);
		if (staged?.type != 'file')
			return {
				ok: false,
				manager,
				action,
				name,
				simulate,
				command: '',
				output: '',
				message: 'Staged package file is not available.'
			};
	}

	if (!length(command))
		command = join(' ', quote_command_args(argv));

	return {
		ok: true,
		manager,
		action,
		name,
		simulate,
		command,
		argv
	};
}

function package_state_snapshot(manager) {
	manager ||= command_exists('apk') ? 'apk' : 'opkg';

	let world_path = manager == 'apk' ? '/etc/apk/world' : '/usr/lib/opkg/status';
	let world_hash = manager == 'apk'
		? trim(shell_output("sha256sum /etc/apk/world 2>/dev/null | awk '{print $1}'"))
		: trim(shell_output("sha256sum /usr/lib/opkg/status 2>/dev/null | awk '{print $1}'"));
	let database_hash = manager == 'apk'
		? trim(shell_output("apk info -vv 2>/dev/null | sort | sha256sum | awk '{print $1}'"))
		: trim(shell_output("opkg list-installed 2>/dev/null | sort | sha256sum | awk '{print $1}'"));
	let package_count = manager == 'apk'
		? int(trim(shell_output("apk info -vv 2>/dev/null | wc -l")))
		: int(trim(shell_output("opkg list-installed 2>/dev/null | wc -l")));
	let luci_app_count = manager == 'apk'
		? int(trim(shell_output("apk info -vv 2>/dev/null | grep -c '^luci-app-'")))
		: int(trim(shell_output("opkg list-installed 2>/dev/null | grep -c '^luci-app-'")));

	return {
		manager,
		worldPath: world_path,
		worldHash: world_hash,
		databaseHash: database_hash,
		packageCount: package_count,
		luciAppCount: luci_app_count
	};
}

function package_action(action, name, simulate, options) {
	let plan = package_action_plan(action, name, simulate, options);

	if (!plan.ok)
		return plan;

	let state_before = package_state_snapshot(plan.manager);
	let command = plan.command;
	let command_quoted = quote_command_args([command])[0];
	let output_path = '/tmp/i-love-luci-package-action.log';
	let output_quoted = quote_command_args([output_path])[0];
	let code = system(`sh -c ${command_quoted} >${output_quoted} 2>&1`);
	let output = shell_output(`sed -n "1,220p" ${output_quoted}`);
	system(`rm -f ${output_quoted} >/dev/null 2>&1 || true`);
	let state_after = package_state_snapshot(plan.manager);

	return {
		ok: code == 0,
		manager: plan.manager,
		action: plan.action,
		name: plan.name,
		simulate: plan.simulate,
		command,
		output,
		stateBefore: state_before,
		stateAfter: state_after,
		message: code == 0 ? (plan.simulate ? 'Package action simulated.' : 'Package action complete.') : (plan.simulate ? 'Package action simulation failed.' : 'Package action failed.')
	};
}

function package_job_id() {
	let value = trim(shell_output(`dd if=/dev/urandom bs=8 count=1 2>/dev/null | hexdump -ve '1/1 "%02x"'`));
	if (!length(value))
		value = trim(shell_output('date +%s')) + '-' + trim(shell_output('echo $$'));
	return replace(value, /[^A-Za-z0-9_.-]/g, '');
}

function valid_package_job_id(id) {
	id = trim('' + (id || ''));
	return length(id) > 0 && length(id) <= 80 && replace(id, /[^A-Za-z0-9_.-]/g, '') == id;
}

function package_job_paths(id) {
	return {
		meta: '/tmp/i-love-luci-package-job-' + id + '.json',
		output: '/tmp/i-love-luci-package-job-' + id + '.log',
		rc: '/tmp/i-love-luci-package-job-' + id + '.rc'
	};
}

let package_job_status;

function package_job_output(path) {
	if (stat(path)?.type != 'file')
		return '';

	let output_quoted = quote_command_args([path])[0];
	return shell_output(`sed -n "1,220p" ${output_quoted}`);
}

function package_job_start(action, name, options) {
	let plan = package_action_plan(action, name, false, options);

	if (!plan.ok)
		return {
			started: false,
			job: null,
			result: plan
		};

	if (plan.action == 'upgrade')
		return {
			started: false,
			job: null,
			result: {
				ok: false,
				manager: plan.manager,
				action: plan.action,
				name: plan.name,
				simulate: false,
				command: plan.command,
				output: '',
				message: 'Package upgrade apply stays in LuCI compat until rollback parity is complete.'
			}
		};

	let id = package_job_id();
	let paths = package_job_paths(id);
	let meta = {
		id,
		manager: plan.manager,
		action: plan.action,
		name: plan.name,
		simulate: false,
		command: plan.command,
		stateBefore: package_state_snapshot(plan.manager),
		startedAt: trim(shell_output('date +%s'))
	};
	let output_quoted = quote_command_args([paths.output])[0];
	let rc_quoted = quote_command_args([paths.rc])[0];
	let command = plan.command;
	let command_quoted = quote_command_args([command])[0];

	writefile(paths.meta, sprintf('%J', meta));
	system(`(sh -c ${command_quoted} >${output_quoted} 2>&1; echo $? >${rc_quoted}) >/dev/null 2>&1 &`);

	return {
		started: true,
		job: package_job_status(id),
		result: null
	};
}

package_job_status = function(id) {
	if (!valid_package_job_id(id))
		return {
			id,
			running: false,
			done: true,
			result: {
				ok: false,
				manager: command_exists('apk') ? 'apk' : 'opkg',
				action: '',
				name: '',
				simulate: false,
				command: '',
				output: '',
				message: 'Package job id is invalid.'
			}
		};

	let paths = package_job_paths(id);
	let meta = read_jsonfile(paths.meta, null);

	if (!meta)
		return {
			id,
			running: false,
			done: true,
			result: {
				ok: false,
				manager: command_exists('apk') ? 'apk' : 'opkg',
				action: '',
				name: '',
				simulate: false,
				command: '',
				output: '',
				message: 'Package job was not found.'
			}
		};

	let rc_text = trim(readfile(paths.rc) || '');
	let done = length(rc_text) > 0;
	let code = done ? +rc_text : null;
	let output = package_job_output(paths.output);
	let ok = done && code == 0;

	return {
		id,
		running: !done,
		done,
		result: {
			ok,
			manager: meta.manager || (command_exists('apk') ? 'apk' : 'opkg'),
			action: meta.action || '',
			name: meta.name || '',
			simulate: false,
			command: meta.command || '',
			output,
			stateBefore: meta.stateBefore || null,
			stateAfter: done ? package_state_snapshot(meta.manager || (command_exists('apk') ? 'apk' : 'opkg')) : null,
			message: done ? (ok ? 'Package action complete.' : 'Package action failed.') : 'Package action running.'
		}
	};
};

function uci_change_rows() {
	let rows = [];
	let output = trim(shell_output('uci changes 2>/dev/null'));

	if (!length(output))
		return rows;

	for (let line in split(output, '\n')) {
		let parts = split(line, '=');

		if (length(parts) < 2)
			continue;

		let left = parts[0] || '';
		let value_parts = [];

		for (let i = 1; i < length(parts); i++)
			push(value_parts, parts[i]);

		let value = join('=', value_parts);
		let path = split(left, '.');
		let option_parts = [];

		if (length(path) < 2)
			continue;

		for (let i = 2; i < length(path); i++)
			push(option_parts, path[i]);

		if (substr(value, 0, 1) == "'" && substr(value, length(value) - 1) == "'")
			value = substr(value, 1, length(value) - 2);

		push(rows, {
			config: path[0] || '',
			action: 'set',
			section: path[1] || '',
			option: join('.', option_parts),
			value
		});
	}

	return rows;
}

function revert_uci_changes() {
	let rows = uci_change_rows();
	let configs = {};

	for (let row in rows)
		if (row.config)
			configs[row.config] = true;

	for (let config, _ in configs)
		system(`uci revert ${config} >/dev/null 2>&1`);

	return length(rows);
}

function service_logs(meta) {
	if (!meta?.logPattern)
		return {};

	let grep = join(' ', quote_command_args(['grep', '-Ei', meta.logPattern]));
	let output = shell_output(`logread 2>/dev/null | ${grep} | tail -n 80`);

	if (!length(trim(output)))
		return {};

	return {
		activity: output
	};
}

function service_files(meta) {
	let entries = [];

	for (let file in meta?.files || []) {
		let path = file.path || '';
		let info = stat(path);
		let preview = [];
		let line_count = 0;
		let content = '';
		let quoted = quote_command_args([path])[0];

		if (info?.type == 'file') {
			line_count = int(trim(shell_output(`wc -l < ${quoted}`)) || 0);
			preview = split(trim(shell_output(`sed -n '1,20p' ${quoted}`)), '\n');

			if (file.editable && info.size <= 131072)
				content = readfile(path) || '';
		}

		if (length(preview) == 1 && !length(preview[0]))
			preview = [];

		push(entries, {
			title: file.title || path,
			path,
			exists: info?.type == 'file',
			size: info?.size || 0,
			lines: line_count,
			preview,
			editable: !!file.editable,
			content
		});
	}

	return entries;
}

function whitelisted_service_file(service_id, path) {
	let meta = servicePackages[service_id] || null;

	for (let file in meta?.files || []) {
		if (file.editable && file.path == path)
			return file;
	}

	return null;
}

function save_banip_file(path, text) {
	path = replace(trim('' + (path || '')), /[\r\n]/g, '');
	text = '' + (text || '');

	if (length(text) > 131072)
		return {
			saved: false,
			message: 'banIP file is too large.',
			changed: false,
			file: null
		};

	let file = whitelisted_service_file('banip', path);

	if (!file)
		return {
			saved: false,
			message: 'banIP file is not editable from I Love LuCI.',
			changed: false,
			file: null
		};

	let current = readfile(path) || '';
	let changed = current != text;

	if (changed) {
		writefile(path, text);
		system('/etc/init.d/banip reload >/dev/null 2>&1 || /etc/init.d/banip restart >/dev/null 2>&1 || true');
	}

	let meta = {
		files: [file]
	};

	return {
		saved: true,
		message: changed ? 'banIP file saved and reloaded.' : 'banIP file already up to date.',
		changed,
		file: service_files(meta)?.[0] || null
	};
}

function service_detail(id) {
	let meta = servicePackages[id] || null;

	if (!meta)
		return {
			id,
			title: id,
			package: id,
			init: null,
			sections: [],
			customCommands: [],
			files: [],
			logs: {}
		};

	let files = [];
	let logs = {};
	let upnp_rules = [];

	try {
		files = service_files(meta);
	}
	catch (e) {
		files = [];
	}

	try {
		logs = service_logs(meta);
	}
	catch (e) {
		logs = {};
	}

	if (id == 'upnpd') {
		try {
			upnp_rules = upnpd_active_rules();
		}
		catch (e) {
			upnp_rules = [];
		}
	}

	return {
		id,
		title: meta.title,
		package: meta.package,
		compatPath: meta.compatPath || null,
		init: fast_service_state(meta.init),
		sections: collect_uci_config(meta.package, meta.sections || []),
		customCommands: id == 'commands' ? custom_command_entries() : [],
		upnpActiveRules: upnp_rules,
		files,
		logs
	};
}

function service_action(id, action) {
	let meta = servicePackages[id] || null;

	if (!meta?.init)
		return {
			ok: false,
			message: 'This service does not expose an init script.',
			state: null
		};

	return run_init_action(meta.init, action);
}

function save_crontab(text) {
	text = '' + (text || '');

	if (length(text) > 65535)
		return {
			saved: false,
			message: 'Crontab is too large.'
		};

	writefile('/etc/crontabs/root', text);
	system('/etc/init.d/cron reload >/dev/null 2>&1 || /etc/init.d/cron restart >/dev/null 2>&1');

	return {
		saved: true,
		message: 'Crontab saved.'
	};
}

function save_ssh_keys(text) {
	text = '' + (text || '');

	if (length(text) > 65535)
		return {
			saved: false,
			message: 'SSH authorized keys file is too large.'
		};

	writefile(sshAuthorizedKeysPath, text);

	return {
		saved: true,
		message: 'SSH keys saved.'
	};
}

function save_rc_local(text) {
	text = '' + (text || '');

	if (length(text) > 65535)
		return {
			saved: false,
			message: 'Local startup file is too large.'
		};

	writefile(rcLocalPath, text);
	system(`chmod 0644 ${rcLocalPath} >/dev/null 2>&1`);

	return {
		saved: true,
		message: 'Local startup saved.'
	};
}

function on_off(value) {
	value = '' + (value || '');
	return (value == '1' || value == 'true' || value == 'on' || value == 'yes') ? 'on' : 'off';
}

function zero_one(value) {
	value = '' + (value || '');
	return (value == '1' || value == 'true' || value == 'on' || value == 'yes') ? '1' : '0';
}

function first_uci_section(package_name, section_type) {
	let section = null;

	uci.load(package_name);
	uci.foreach(package_name, section_type, function(s) {
		section ??= s['.name'];
	});

	return section;
}

function set_uci_option(package_name, section, option, value) {
	if (value == null || value == '')
		uci.delete(package_name, section, option);
	else
		uci.set(package_name, section, option, value);
}

let save_dropbear_config_rows;

function save_dropbear_config(config) {
	config ||= {};

	if (type(config.rows) == 'array')
		return save_dropbear_config_rows(config.rows);

	let section = first_uci_section('dropbear', 'dropbear') || uci.add('dropbear', 'dropbear');
	let port = int(config.Port || config.port || 22);

	if (port < 1 || port > 65535)
		return {
			saved: false,
			message: 'SSH port must be between 1 and 65535.',
			changed: false,
			section: null
		};

	let next = {
		enable: zero_one(config.enable),
		Port: '' + port,
		PasswordAuth: on_off(config.PasswordAuth),
		RootPasswordAuth: on_off(config.RootPasswordAuth),
		GatewayPorts: on_off(config.GatewayPorts) == 'on' ? 'on' : '',
		Interface: trim('' + (config.Interface || '')),
		DirectInterface: trim('' + (config.DirectInterface || ''))
	};
	let current = {};

	for (let key, value in next)
		current[key] = uci.get('dropbear', section, key) || '';

	let changed = false;
	for (let key, value in next)
		if (current[key] != value)
			changed = true;

	if (changed) {
		for (let key, value in next)
			set_uci_option('dropbear', section, key, value);

		uci.commit('dropbear');
		system('/etc/init.d/dropbear reload >/dev/null 2>&1 || /etc/init.d/dropbear restart >/dev/null 2>&1');
	}

	return {
		saved: true,
		message: changed ? 'SSH access saved and reloaded.' : 'SSH access already up to date.',
		changed,
		section: (collect_uci_config('dropbear', ['dropbear']) || [])[0] || null,
		init: fast_service_state('dropbear')
	};
}

save_dropbear_config_rows = function(rows) {
	rows ||= [];
	uci.load('dropbear');

	if (!length(rows))
		return {
			saved: false,
			message: 'At least one SSH access instance is required.',
			changed: false,
			section: null,
			sections: collect_uci_config('dropbear', ['dropbear']),
			init: fast_service_state('dropbear')
		};

	let existing = {};
	uci.foreach('dropbear', 'dropbear', function(section) {
		existing[section['.name']] = true;
	});

	let keep = {};
	let validated = [];

	for (let row in rows) {
		let section = replace(trim('' + (row?.section || '')), /[\r\n]/g, '');
		let is_existing = length(section) && existing[section] == true;
		let port = int(row?.Port || row?.port || 22);
		let bind_mode = row?.bindMode == 'direct' ? 'direct' : (row?.bindMode == 'interface' ? 'interface' : 'all');
		let iface = trim('' + (row?.Interface || ''));
		let direct_iface = trim('' + (row?.DirectInterface || ''));

		if (length(section) && !is_existing)
			return {
				saved: false,
				message: 'SSH access instance no longer exists. Refresh and try again.',
				changed: false,
				section: null,
				sections: collect_uci_config('dropbear', ['dropbear']),
				init: fast_service_state('dropbear')
			};

		if (port < 1 || port > 65535)
			return {
				saved: false,
				message: 'SSH port must be between 1 and 65535.',
				changed: false,
				section: null,
				sections: collect_uci_config('dropbear', ['dropbear']),
				init: fast_service_state('dropbear')
			};

		if (bind_mode == 'all') {
			iface = '';
			direct_iface = '';
		}
		else if (bind_mode == 'direct') {
			iface = '';
		}
		else {
			direct_iface = '';
		}

		if ((length(iface) && replace(iface, /[^A-Za-z0-9_.: -]/g, '') != iface) || (length(direct_iface) && replace(direct_iface, /[^A-Za-z0-9_.: -]/g, '') != direct_iface))
			return {
				saved: false,
				message: 'SSH listen interface contains unsupported characters.',
				changed: false,
				section: null,
				sections: collect_uci_config('dropbear', ['dropbear']),
				init: fast_service_state('dropbear')
			};

		push(validated, {
			section,
			is_existing,
			next: {
				enable: zero_one(row?.enable),
				Port: '' + port,
				PasswordAuth: on_off(row?.PasswordAuth),
				RootPasswordAuth: on_off(row?.RootPasswordAuth),
				GatewayPorts: on_off(row?.GatewayPorts) == 'on' ? 'on' : '',
				Interface: iface,
				DirectInterface: direct_iface
			}
		});
	}

	let changed = false;

	for (let item in validated) {
		let section = item.section;

		if (!item.is_existing) {
			section = uci.add('dropbear', 'dropbear');
			changed = true;
		}

		keep[section] = true;

		for (let key, value in item.next) {
			let current = uci.get('dropbear', section, key) || '';

			if (current != value) {
				changed = true;
				set_uci_option('dropbear', section, key, value);
			}
		}
	}

	for (let section in existing) {
		if (!keep[section]) {
			uci.delete('dropbear', section);
			changed = true;
		}
	}

	if (changed) {
		uci.commit('dropbear');
		system('/etc/init.d/dropbear reload >/dev/null 2>&1 || /etc/init.d/dropbear restart >/dev/null 2>&1');
	}

	let sections = collect_uci_config('dropbear', ['dropbear']);

	return {
		saved: true,
		message: changed ? 'SSH access saved and reloaded.' : 'SSH access already up to date.',
		changed,
		section: (sections || [])[0] || null,
		sections,
		init: fast_service_state('dropbear')
	};
};

function clean_uci_value(value) {
	value = trim('' + (value || ''));
	return replace(value, /[\r\n]/g, '');
}

function split_uci_lines(value) {
	let rows = [];

	for (let line in split('' + (value || ''), '\n')) {
		line = clean_uci_value(line);

		if (length(line))
			push(rows, line);
	}

	return rows;
}

function normalize_uci_list(value) {
	if (type(value) == 'array')
		return value;

	if (value == null || value == '')
		return [];

	return [value];
}

function uci_list_equal(a, b) {
	a = normalize_uci_list(a);
	b = normalize_uci_list(b);

	if (length(a) != length(b))
		return false;

	for (let i = 0; i < length(a); i++)
		if (a[i] != b[i])
			return false;

	return true;
}

function valid_numeric_value(value) {
	return value == '' || replace(value, /[^0-9]/g, '') == value;
}

function valid_signed_numeric_value(value) {
	return value == '' || match(value, /^-?[0-9]+$/);
}

function valid_decimal_value(value) {
	value = '' + (value || '');
	return value == '' || match(value, /^-?[0-9]+(\.[0-9]+)?$/);
}

function collect_luci_config_sections() {
	function luci_get(path, fallback) {
		let value = trim(shell_output(`uci -q get ${path}`));
		return length(value) ? value : fallback;
	}

	return [
	{
		name: 'main',
		type: luci_get('luci.main', 'core'),
		values: {
			lang: luci_get('luci.main.lang', 'auto'),
			mediaurlbase: luci_get('luci.main.mediaurlbase', ''),
			resourcebase: luci_get('luci.main.resourcebase', ''),
			ubuspath: luci_get('luci.main.ubuspath', ''),
			tablefilters: luci_get('luci.main.tablefilters', ''),
			sessiontime: luci_get('luci.sauth.sessiontime', '')
		}
	},
	{
		name: 'apply',
		type: luci_get('luci.apply', 'internal'),
		values: {
			rollback: luci_get('luci.apply.rollback', ''),
			holdoff: luci_get('luci.apply.holdoff', ''),
			timeout: luci_get('luci.apply.timeout', ''),
			display: luci_get('luci.apply.display', '')
		}
	},
	{
		name: 'themes',
		type: luci_get('luci.themes', 'internal'),
		values: {
			Bootstrap: luci_get('luci.themes.Bootstrap', ''),
			BootstrapDark: luci_get('luci.themes.BootstrapDark', ''),
			BootstrapLight: luci_get('luci.themes.BootstrapLight', ''),
			OpenWrt: luci_get('luci.themes.OpenWrt', ''),
			Material: luci_get('luci.themes.Material', ''),
			OpenWrt2020: luci_get('luci.themes.OpenWrt2020', ''),
			ILoveLuCI: luci_get('luci.themes.ILoveLuCI', '')
		}
	},
	{
		name: 'languages',
		type: luci_get('luci.languages', 'internal'),
		values: {
			auto: 'Auto'
		}
	}
	];
}

function collect_system_settings_sections() {
	let system = collect_uci_config('system', ['system', 'timeserver', 'led', 'button']);

	for (let section in collect_luci_config_sections())
		push(system, section);

	for (let section in collect_uci_config('dropbear', ['dropbear']))
		push(system, section);

	for (let section in collect_uci_config('uhttpd', ['uhttpd', 'cert', 'cert_defaults']))
		push(system, section);

	return system;
}

function save_luci_ui_settings(config) {
	config ||= {};
	uci.load('luci');

	let main = uci.get('luci', 'main') ? 'main' : uci.add('luci', 'core');
	let sauth = uci.get('luci', 'sauth') ? 'sauth' : uci.add('luci', 'internal');
	let apply = uci.get('luci', 'apply') ? 'apply' : uci.add('luci', 'internal');
	let lang = clean_uci_value(config.lang || 'auto');
	let mediaurlbase = clean_uci_value(config.mediaurlbase || '');
	let tablefilters = zero_one(config.tablefilters);
	let sessiontime = clean_uci_value(config.sessiontime || '');
	let rollback = clean_uci_value(config.rollback || '');
	let holdoff = clean_uci_value(config.holdoff || '');
	let timeout = clean_uci_value(config.timeout || '');
	let display = clean_uci_value(config.display || '');
	let valid_theme = false;

	if (replace(lang, /[^A-Za-z0-9_-]/g, '') != lang)
		return {
			saved: false,
			message: 'Language contains unsupported characters.',
			changed: false,
			sections: collect_system_settings_sections()
		};

	if (!valid_numeric_value(sessiontime) || !valid_numeric_value(rollback) || !valid_numeric_value(holdoff) || !valid_numeric_value(timeout) || !valid_decimal_value(display))
		return {
			saved: false,
			message: 'Session and apply timing values must be numeric.',
			changed: false,
			sections: collect_system_settings_sections()
		};

	for (let section in collect_luci_config_sections()) {
		if (section.name != 'themes')
			continue;

		for (let key, value in section.values)
			if (value == mediaurlbase)
				valid_theme = true;
	}

	if (!valid_theme)
		return {
			saved: false,
			message: 'Selected theme path is not registered in LuCI.',
			changed: false,
			sections: collect_system_settings_sections()
		};

	let changed = false;
	let main_next = {
		lang,
		mediaurlbase
	};
	let sauth_next = { sessiontime };
	let apply_next = {
		rollback,
		holdoff,
		timeout,
		display
	};

	for (let key, value in main_next) {
		if ((uci.get('luci', main, key) || '') != value) {
			changed = true;
			set_uci_option('luci', main, key, value);
		}
	}

	let current_tablefilters = uci.get('luci', main, 'tablefilters') || '0';
	if (current_tablefilters != tablefilters) {
		changed = true;
		if (tablefilters == '1')
			uci.set('luci', main, 'tablefilters', '1');
		else
			uci.delete('luci', main, 'tablefilters');
	}

	for (let key, value in sauth_next) {
		if ((uci.get('luci', sauth, key) || '') != value) {
			changed = true;
			set_uci_option('luci', sauth, key, value);
		}
	}

	for (let key, value in apply_next) {
		if ((uci.get('luci', apply, key) || '') != value) {
			changed = true;
			set_uci_option('luci', apply, key, value);
		}
	}

	if (changed)
		uci.commit('luci');

	return {
		saved: true,
		message: changed ? 'LuCI UI settings saved.' : 'LuCI UI settings already up to date.',
		changed,
		sections: collect_system_settings_sections()
	};
}

function save_system_settings(config) {
	config ||= {};
	uci.load('system');

	let system_section = first_uci_section('system', 'system');

	if (!system_section)
		system_section = uci.add('system', 'system');

	let hostname = clean_uci_value(config.hostname || 'OpenWrt');

	if (!length(hostname) || !match(hostname, /^[A-Za-z0-9][A-Za-z0-9.-]*$/))
		return {
			saved: false,
			message: 'Hostname must start with a letter or number and contain only letters, numbers, dots, and dashes.',
			changed: false,
			sections: collect_system_settings_sections()
		};

	let next_system = {
		hostname,
		description: clean_uci_value(config.description || ''),
		notes: clean_uci_value(config.notes || ''),
		zonename: clean_uci_value(config.zonename || ''),
		timezone: clean_uci_value(config.timezone || ''),
		clock_timestyle: zero_one(config.clock_timestyle),
		clock_hourcycle: clean_uci_value(config.clock_hourcycle || ''),
		log_size: clean_uci_value(config.log_size || ''),
		log_ip: clean_uci_value(config.log_ip || ''),
		log_port: clean_uci_value(config.log_port || ''),
		log_proto: config.log_proto == 'tcp' ? 'tcp' : 'udp',
		log_file: clean_uci_value(config.log_file || ''),
		conloglevel: clean_uci_value(config.conloglevel || ''),
		cronloglevel: clean_uci_value(config.cronloglevel || '')
	};

	if (replace(next_system.zonename, /[^A-Za-z0-9_./+-]/g, '') != next_system.zonename || replace(next_system.timezone, /[^A-Za-z0-9_.,:<>+-]/g, '') != next_system.timezone)
		return {
			saved: false,
			message: 'Timezone fields contain unsupported characters.',
			changed: false,
			sections: collect_system_settings_sections()
		};

	if (next_system.clock_hourcycle != '' && next_system.clock_hourcycle != 'h12' && next_system.clock_hourcycle != 'h23')
		return {
			saved: false,
			message: 'Time format contains unsupported characters.',
			changed: false,
			sections: collect_system_settings_sections()
		};

	if (replace(next_system.log_ip, /[^A-Za-z0-9_.:-]/g, '') != next_system.log_ip || replace(next_system.log_file, /[^A-Za-z0-9_./:-]/g, '') != next_system.log_file)
		return {
			saved: false,
			message: 'Log server and file fields contain unsupported characters.',
			changed: false,
			sections: collect_system_settings_sections()
		};

	if (!valid_numeric_value(next_system.log_size) || !valid_numeric_value(next_system.log_port) || !valid_numeric_value(next_system.conloglevel) || !valid_numeric_value(next_system.cronloglevel))
		return {
			saved: false,
			message: 'Log size and log levels must be numeric.',
			changed: false,
			sections: collect_system_settings_sections()
		};

	let ntp_section = first_uci_section('system', 'timeserver');
	let next_ntp = {
		enabled: zero_one(config.ntp_enabled),
		enable_server: zero_one(config.ntp_enable_server),
		interface: clean_uci_value(config.ntp_interface || ''),
		use_dhcp: zero_one(config.ntp_use_dhcp),
		server: split_uci_lines(config.ntp_servers || '')
	};

	if (replace(next_ntp.interface, /[^A-Za-z0-9_.:-]/g, '') != next_ntp.interface)
		return {
			saved: false,
			message: 'NTP interface contains unsupported characters.',
			changed: false,
			sections: collect_system_settings_sections()
		};

	let changed = false;

	for (let key, value in next_system) {
		let current = uci.get('system', system_section, key) || '';

		if (key == 'clock_timestyle' && !length(current) && value == '0')
			continue;

		if (current != value) {
			changed = true;
			set_uci_option('system', system_section, key, value);
		}
	}

	if (!ntp_section) {
		ntp_section = uci.add('system', 'timeserver');
		changed = true;
	}

	let current_ntp_enabled = uci.get('system', ntp_section, 'enabled') || '1';
	let current_ntp_enable_server = uci.get('system', ntp_section, 'enable_server') || '0';
	let current_ntp_interface = uci.get('system', ntp_section, 'interface') || '';
	let current_ntp_use_dhcp = uci.get('system', ntp_section, 'use_dhcp') || '1';
	let current_ntp_servers = uci.get('system', ntp_section, 'server') || [];

	if (current_ntp_enabled != next_ntp.enabled) {
		changed = true;
		if (next_ntp.enabled == '1')
			uci.delete('system', ntp_section, 'enabled');
		else
			uci.set('system', ntp_section, 'enabled', '0');
	}

	if (current_ntp_enable_server != next_ntp.enable_server) {
		changed = true;
		if (next_ntp.enable_server == '1')
			uci.set('system', ntp_section, 'enable_server', '1');
		else
			uci.delete('system', ntp_section, 'enable_server');
	}

	if (current_ntp_interface != next_ntp.interface) {
		changed = true;
		set_uci_option('system', ntp_section, 'interface', next_ntp.interface);
	}

	if (current_ntp_use_dhcp != next_ntp.use_dhcp) {
		changed = true;
		if (next_ntp.use_dhcp == '1')
			uci.delete('system', ntp_section, 'use_dhcp');
		else
			uci.set('system', ntp_section, 'use_dhcp', '0');
	}

	if (!uci_list_equal(current_ntp_servers, next_ntp.server)) {
		changed = true;
		if (length(next_ntp.server))
			uci.set('system', ntp_section, 'server', next_ntp.server);
		else
			uci.delete('system', ntp_section, 'server');
	}

	if (changed) {
		uci.commit('system');
		system('/etc/init.d/system reload >/dev/null 2>&1 || true');
		system('/etc/init.d/sysntpd restart >/dev/null 2>&1 || true');
	}

	return {
		saved: true,
		message: changed ? 'System settings saved and services reloaded.' : 'System settings already up to date.',
		changed,
		sections: collect_system_settings_sections()
	};
}

function sync_system_time(action, localtime) {
	action = clean_uci_value(action || '');

	if (action == 'browser') {
		let timestamp = int(localtime || 0);

		if (timestamp <= 0)
			return {
				ok: false,
				message: 'Browser time was not provided.',
				localtime: null
			};

		let result = null;
		try {
			result = ubus.call('luci', 'setLocaltime', { localtime: timestamp });
		}
		catch (e) {
			return {
				ok: false,
				message: 'Browser time sync failed.',
				localtime: null
			};
		}

		let ok = result?.result == true || result == true;
		return {
			ok,
			message: ok ? 'System time synced with browser.' : 'Browser time sync failed.',
			localtime: timestamp
		};
	}

	if (action == 'ntp') {
		if (stat('/etc/init.d/sysntpd')?.type != 'file')
			return {
				ok: false,
				message: 'NTP service is not installed.',
				localtime: null
			};

		let ok = system('/etc/init.d/sysntpd restart >/dev/null 2>&1 &') == 0;
		return {
			ok,
			message: ok ? 'NTP service restarted.' : 'NTP sync failed.',
			localtime: null
		};
	}

	return {
		ok: false,
		message: 'Unknown time sync action.',
		localtime: null
	};
}

function save_led_config(rows, allow_empty) {
	rows ||= [];
	allow_empty = allow_empty == true;
	uci.load('system');

	let changed = false;
	let config_changed = false;
	let keep = {};
	let existing = {};
	let existing_order = [];
	let next_order = [];

	uci.foreach('system', 'led', function(section) {
		existing[section['.name']] = true;
		push(existing_order, section['.name']);
	});

	if (!length(rows) && length(existing_order) && !allow_empty)
		return {
			saved: false,
			message: 'Refusing to remove all LED actions without confirmation.',
			changed: false,
			sections: collect_uci_config('system', ['led'])
		};

	for (let row in rows) {
		let section = clean_uci_value(row?.section || '');
		let is_existing = length(section) && uci.get('system', section) == 'led';

		if (!is_existing) {
			section = uci.add('system', 'led');
			changed = true;
			config_changed = true;
		}

		keep[section] = true;
		push(next_order, section);

		let trigger = clean_uci_value(row?.trigger || 'none');
		let next = {
			name: clean_uci_value(row?.name || section),
			sysfs: clean_uci_value(row?.sysfs || ''),
			trigger,
			default: trigger == 'none' ? zero_one(row?.default) : '',
			dev: trigger == 'netdev' ? clean_uci_value(row?.dev || '') : '',
			mode: trigger == 'netdev' ? clean_uci_value(row?.mode || '') : '',
			interval: clean_uci_value(row?.interval || ''),
			delayon: trigger == 'timer' ? clean_uci_value(row?.delayon || '') : '',
			delayoff: trigger == 'timer' ? clean_uci_value(row?.delayoff || '') : '',
			inverted: trigger == 'heartbeat' ? zero_one(row?.inverted) : ''
		};

		if (!length(next.name) || !length(next.sysfs))
			return {
				saved: false,
				message: 'LED name and sysfs LED are required.',
				changed: false,
				sections: collect_uci_config('system', ['led'])
			};

		for (let key, value in next) {
			let current = uci.get('system', section, key) || '';

			if (key == 'default' && !length(current) && value == '0')
				continue;
			if (key == 'inverted' && !length(current) && value == '0')
				continue;

			if (current != value) {
				changed = true;
				config_changed = true;
				set_uci_option('system', section, key, value);
			}
		}
	}

	for (let section in existing) {
		if (!keep[section]) {
			uci.delete('system', section);
			changed = true;
			config_changed = true;
		}
	}

	let current_order = [];
	for (let section in existing_order)
		if (keep[section])
			push(current_order, section);

	let order_changed = length(current_order) != length(next_order);
	if (!order_changed) {
		for (let i = 0; i < length(next_order); i++) {
			if (current_order[i] != next_order[i]) {
				order_changed = true;
				break;
			}
		}
	}

	if (order_changed)
		changed = true;

	if (changed) {
		if (config_changed)
			uci.commit('system');

		if (order_changed) {
			for (let i = 0; i < length(next_order); i++) {
				let section = next_order[i];

				if (replace(section, /[^A-Za-z0-9_.-]/g, '') == section)
					system('uci reorder system.' + section + '=' + i + ' >/dev/null 2>&1 || true');
			}

			system('uci commit system >/dev/null 2>&1 || true');
		}

		system('/etc/init.d/led reload >/dev/null 2>&1 || /etc/init.d/led restart >/dev/null 2>&1');
	}

	return {
		saved: true,
		message: changed ? 'LED configuration saved and reloaded.' : 'LED configuration already up to date.',
		changed,
		sections: collect_uci_config('system', ['led'])
	};
}

let save_uhttpd_config_rows;

function save_uhttpd_config(config) {
	config ||= {};

	if (type(config.rows) == 'array')
		return save_uhttpd_config_rows(config.rows);

	uci.load('uhttpd');

	let requested_section = clean_uci_value(config.section || '');
	let section = length(requested_section) && uci.get('uhttpd', requested_section) == 'uhttpd' ? requested_section : (first_uci_section('uhttpd', 'uhttpd') || 'main');
	let listen_http = config.listen_http == null ? normalize_uci_list(uci.get('uhttpd', section, 'listen_http') || []) : split_uci_lines(config.listen_http || '');
	let listen_https = config.listen_https == null ? normalize_uci_list(uci.get('uhttpd', section, 'listen_https') || []) : split_uci_lines(config.listen_https || '');
	let list_options = {
		index_page: config.index_page == null ? normalize_uci_list(uci.get('uhttpd', section, 'index_page') || []) : split_uci_lines(config.index_page || ''),
		interpreter: config.interpreter == null ? normalize_uci_list(uci.get('uhttpd', section, 'interpreter') || []) : split_uci_lines(config.interpreter || ''),
		alias: config.alias == null ? normalize_uci_list(uci.get('uhttpd', section, 'alias') || []) : split_uci_lines(config.alias || ''),
		lua_prefix: config.lua_prefix == null ? normalize_uci_list(uci.get('uhttpd', section, 'lua_prefix') || []) : split_uci_lines(config.lua_prefix || '')
	};
	let next = {
		redirect_https: zero_one(config.redirect_https),
		home: config.home == null ? (uci.get('uhttpd', section, 'home') || '') : clean_uci_value(config.home || ''),
		rfc1918_filter: config.rfc1918_filter == null ? (uci.get('uhttpd', section, 'rfc1918_filter') || '') : zero_one(config.rfc1918_filter),
		no_symlinks: config.no_symlinks == null ? (uci.get('uhttpd', section, 'no_symlinks') || '') : zero_one(config.no_symlinks),
		no_dirlists: config.no_dirlists == null ? (uci.get('uhttpd', section, 'no_dirlists') || '') : zero_one(config.no_dirlists),
		max_requests: config.max_requests == null ? (uci.get('uhttpd', section, 'max_requests') || '') : clean_uci_value(config.max_requests || ''),
		max_connections: config.max_connections == null ? (uci.get('uhttpd', section, 'max_connections') || '') : clean_uci_value(config.max_connections || ''),
		cert: config.cert == null ? (uci.get('uhttpd', section, 'cert') || '') : clean_uci_value(config.cert || ''),
		key: config.key == null ? (uci.get('uhttpd', section, 'key') || '') : clean_uci_value(config.key || ''),
		cgi_prefix: config.cgi_prefix == null ? (uci.get('uhttpd', section, 'cgi_prefix') || '') : clean_uci_value(config.cgi_prefix || ''),
		lua_handler: config.lua_handler == null ? (uci.get('uhttpd', section, 'lua_handler') || '') : clean_uci_value(config.lua_handler || ''),
		realm: config.realm == null ? (uci.get('uhttpd', section, 'realm') || '') : clean_uci_value(config.realm || ''),
		config: config.config == null ? (uci.get('uhttpd', section, 'config') || '') : clean_uci_value(config.config || ''),
		error_page: config.error_page == null ? (uci.get('uhttpd', section, 'error_page') || '') : clean_uci_value(config.error_page || ''),
		script_timeout: config.script_timeout == null ? (uci.get('uhttpd', section, 'script_timeout') || '') : clean_uci_value(config.script_timeout || ''),
		network_timeout: config.network_timeout == null ? (uci.get('uhttpd', section, 'network_timeout') || '') : clean_uci_value(config.network_timeout || ''),
		http_keepalive: config.http_keepalive == null ? (uci.get('uhttpd', section, 'http_keepalive') || '') : clean_uci_value(config.http_keepalive || ''),
		tcp_keepalive: config.tcp_keepalive == null ? (uci.get('uhttpd', section, 'tcp_keepalive') || '') : zero_one(config.tcp_keepalive),
		ubus_prefix: config.ubus_prefix == null ? (uci.get('uhttpd', section, 'ubus_prefix') || '') : clean_uci_value(config.ubus_prefix || ''),
		ubus_socket: config.ubus_socket == null ? (uci.get('uhttpd', section, 'ubus_socket') || '') : clean_uci_value(config.ubus_socket || ''),
		ubus_cors: config.ubus_cors == null ? (uci.get('uhttpd', section, 'ubus_cors') || '') : zero_one(config.ubus_cors),
		no_ubusauth: config.no_ubusauth == null ? (uci.get('uhttpd', section, 'no_ubusauth') || '') : zero_one(config.no_ubusauth)
	};

	for (let value in listen_http)
		if (replace(value, /[^A-Za-z0-9:.\\[\\]_-]/g, '') != value)
			return {
				saved: false,
				message: 'HTTP listener contains unsupported characters.',
				changed: false,
				section: (collect_uci_config('uhttpd', ['uhttpd']) || [])[0] || null,
				init: fast_service_state('uhttpd')
			};

	for (let value in listen_https)
		if (replace(value, /[^A-Za-z0-9:.\\[\\]_-]/g, '') != value)
			return {
				saved: false,
				message: 'HTTPS listener contains unsupported characters.',
				changed: false,
				section: (collect_uci_config('uhttpd', ['uhttpd']) || [])[0] || null,
				init: fast_service_state('uhttpd')
			};

	for (let key in ['max_requests', 'max_connections', 'script_timeout', 'network_timeout', 'http_keepalive']) {
		if (!valid_numeric_value(next[key]))
			return {
				saved: false,
				message: 'uHTTPd limits and timeouts must be numeric.',
				changed: false,
				section: (collect_uci_config('uhttpd', ['uhttpd']) || [])[0] || null,
				init: fast_service_state('uhttpd')
			};
	}

	for (let key in ['home', 'cert', 'key', 'cgi_prefix', 'lua_handler', 'config', 'error_page', 'ubus_prefix', 'ubus_socket']) {
		if (replace(next[key], /[^A-Za-z0-9_./:-]/g, '') != next[key])
			return {
				saved: false,
				message: 'uHTTPd path fields contain unsupported characters.',
				changed: false,
				section: (collect_uci_config('uhttpd', ['uhttpd']) || [])[0] || null,
				init: fast_service_state('uhttpd')
			};
	}

	if (replace(next.realm, /[^A-Za-z0-9 .,:_@/+()-]/g, '') != next.realm)
		return {
			saved: false,
			message: 'uHTTPd realm contains unsupported characters.',
			changed: false,
			section: (collect_uci_config('uhttpd', ['uhttpd']) || [])[0] || null,
			init: fast_service_state('uhttpd')
		};

	for (let key, values in list_options) {
		for (let value in values) {
			if (replace(value, /[^A-Za-z0-9_./:=@+-]/g, '') != value)
				return {
					saved: false,
					message: 'uHTTPd list fields contain unsupported characters.',
					changed: false,
					section: (collect_uci_config('uhttpd', ['uhttpd']) || [])[0] || null,
					init: fast_service_state('uhttpd')
				};
		}
	}

	let changed = false;

	if (!uci_list_equal(uci.get('uhttpd', section, 'listen_http') || [], listen_http)) {
		changed = true;
		if (length(listen_http))
			uci.set('uhttpd', section, 'listen_http', listen_http);
		else
			uci.delete('uhttpd', section, 'listen_http');
	}

	if (!uci_list_equal(uci.get('uhttpd', section, 'listen_https') || [], listen_https)) {
		changed = true;
		if (length(listen_https))
			uci.set('uhttpd', section, 'listen_https', listen_https);
		else
			uci.delete('uhttpd', section, 'listen_https');
	}

	for (let key, value in next) {
		let current = uci.get('uhttpd', section, key) || '';
		let optional_flag = key == 'no_symlinks' || key == 'no_dirlists' || key == 'ubus_cors' || key == 'no_ubusauth';

		if (optional_flag && value == '0' && current == '')
			continue;

		if (current != value) {
			changed = true;
			if (optional_flag && value == '0')
				uci.delete('uhttpd', section, key);
			else
				set_uci_option('uhttpd', section, key, value);
		}
	}

	for (let key, value in list_options) {
		if (!uci_list_equal(uci.get('uhttpd', section, key) || [], value)) {
			changed = true;
			set_uci_option('uhttpd', section, key, value);
		}
	}

	if (changed) {
		uci.commit('uhttpd');
		system('/etc/init.d/uhttpd reload >/dev/null 2>&1 || /etc/init.d/uhttpd restart >/dev/null 2>&1');
	}

	let sections = collect_uci_config('uhttpd', ['uhttpd']);

	return {
		saved: true,
		message: changed ? 'HTTP access saved and reloaded.' : 'HTTP access already up to date.',
		changed,
		section: sections?.[0] || null,
		init: fast_service_state('uhttpd')
	};
}

function uhttpd_config_failure(message) {
	let sections = collect_uci_config('uhttpd', ['uhttpd']);

	return {
		saved: false,
		message,
		changed: false,
		section: sections?.[0] || null,
		sections,
		init: fast_service_state('uhttpd')
	};
}

save_uhttpd_config_rows = function(rows) {
	rows ||= [];
	uci.load('uhttpd');

	if (!length(rows))
		return uhttpd_config_failure('At least one web server instance is required.');

	let existing = {};
	uci.foreach('uhttpd', 'uhttpd', function(section) {
		existing[section['.name']] = true;
	});

	let keep = {};
	let validated = [];

	for (let row in rows) {
		let section = replace(trim('' + (row?.section || '')), /[\r\n]/g, '');
		let is_existing = length(section) && existing[section] == true;

		if (length(section) && !is_existing)
			return uhttpd_config_failure('uHTTPd instance no longer exists. Refresh and try again.');

		if (is_existing && keep[section])
			return uhttpd_config_failure('uHTTPd instance is duplicated in the save request.');

		let listen_http = split_uci_lines(row?.listen_http || '');
		let listen_https = split_uci_lines(row?.listen_https || '');
		let list_options = {
			index_page: split_uci_lines(row?.index_page || ''),
			interpreter: split_uci_lines(row?.interpreter || ''),
			alias: split_uci_lines(row?.alias || ''),
			lua_prefix: split_uci_lines(row?.lua_prefix || '')
		};
		let next = {
			redirect_https: zero_one(row?.redirect_https),
			home: clean_uci_value(row?.home || ''),
			rfc1918_filter: zero_one(row?.rfc1918_filter),
			no_symlinks: zero_one(row?.no_symlinks),
			no_dirlists: zero_one(row?.no_dirlists),
			max_requests: clean_uci_value(row?.max_requests || ''),
			max_connections: clean_uci_value(row?.max_connections || ''),
			cert: clean_uci_value(row?.cert || ''),
			key: clean_uci_value(row?.key || ''),
			cgi_prefix: clean_uci_value(row?.cgi_prefix || ''),
			lua_handler: clean_uci_value(row?.lua_handler || ''),
			realm: clean_uci_value(row?.realm || ''),
			config: clean_uci_value(row?.config || ''),
			error_page: clean_uci_value(row?.error_page || ''),
			script_timeout: clean_uci_value(row?.script_timeout || ''),
			network_timeout: clean_uci_value(row?.network_timeout || ''),
			http_keepalive: clean_uci_value(row?.http_keepalive || ''),
			tcp_keepalive: zero_one(row?.tcp_keepalive),
			ubus_prefix: clean_uci_value(row?.ubus_prefix || ''),
			ubus_socket: clean_uci_value(row?.ubus_socket || ''),
			ubus_cors: zero_one(row?.ubus_cors),
			no_ubusauth: zero_one(row?.no_ubusauth)
		};

		for (let value in listen_http)
			if (replace(value, /[^A-Za-z0-9:.\\[\\]_-]/g, '') != value)
				return uhttpd_config_failure('HTTP listener contains unsupported characters.');

		for (let value in listen_https)
			if (replace(value, /[^A-Za-z0-9:.\\[\\]_-]/g, '') != value)
				return uhttpd_config_failure('HTTPS listener contains unsupported characters.');

		for (let key in ['max_requests', 'max_connections', 'script_timeout', 'network_timeout', 'http_keepalive'])
			if (!valid_numeric_value(next[key]))
				return uhttpd_config_failure('uHTTPd limits and timeouts must be numeric.');

		for (let key in ['home', 'cert', 'key', 'cgi_prefix', 'lua_handler', 'config', 'error_page', 'ubus_prefix', 'ubus_socket'])
			if (replace(next[key], /[^A-Za-z0-9_./:-]/g, '') != next[key])
				return uhttpd_config_failure('uHTTPd path fields contain unsupported characters.');

		if (replace(next.realm, /[^A-Za-z0-9 .,:_@/+()-]/g, '') != next.realm)
			return uhttpd_config_failure('uHTTPd realm contains unsupported characters.');

		for (let key, values in list_options) {
			for (let value in values) {
				if (replace(value, /[^A-Za-z0-9_./:=@+-]/g, '') != value)
					return uhttpd_config_failure('uHTTPd list fields contain unsupported characters.');
			}
		}

		push(validated, {
			section,
			is_existing,
			listen_http,
			listen_https,
			list_options,
			next
		});
	}

	let changed = false;

	for (let item in validated) {
		let section = item.section;

		if (!item.is_existing) {
			section = uci.add('uhttpd', 'uhttpd');
			changed = true;
		}

		keep[section] = true;

		if (!uci_list_equal(uci.get('uhttpd', section, 'listen_http') || [], item.listen_http)) {
			changed = true;
			if (length(item.listen_http))
				uci.set('uhttpd', section, 'listen_http', item.listen_http);
			else
				uci.delete('uhttpd', section, 'listen_http');
		}

		if (!uci_list_equal(uci.get('uhttpd', section, 'listen_https') || [], item.listen_https)) {
			changed = true;
			if (length(item.listen_https))
				uci.set('uhttpd', section, 'listen_https', item.listen_https);
			else
				uci.delete('uhttpd', section, 'listen_https');
		}

		for (let key, value in item.next) {
			let current = uci.get('uhttpd', section, key) || '';
			let optional_flag = key == 'no_symlinks' || key == 'no_dirlists' || key == 'ubus_cors' || key == 'no_ubusauth';

			if (optional_flag && value == '0' && current == '')
				continue;

			if (current != value) {
				changed = true;
				if (optional_flag && value == '0')
					uci.delete('uhttpd', section, key);
				else
					set_uci_option('uhttpd', section, key, value);
			}
		}

		for (let key, value in item.list_options) {
			if (!uci_list_equal(uci.get('uhttpd', section, key) || [], value)) {
				changed = true;
				if (length(value))
					uci.set('uhttpd', section, key, value);
				else
					uci.delete('uhttpd', section, key);
			}
		}
	}

	for (let section in existing) {
		if (!keep[section]) {
			uci.delete('uhttpd', section);
			changed = true;
		}
	}

	if (changed) {
		uci.commit('uhttpd');
		system('/etc/init.d/uhttpd reload >/dev/null 2>&1 || /etc/init.d/uhttpd restart >/dev/null 2>&1');
	}

	let sections = collect_uci_config('uhttpd', ['uhttpd']);

	return {
		saved: true,
		message: changed ? 'HTTP access saved and reloaded.' : 'HTTP access already up to date.',
		changed,
		section: sections?.[0] || null,
		sections,
		init: fast_service_state('uhttpd')
	};
};

function save_uhttpd_cert_defaults(config) {
	config ||= {};
	uci.load('uhttpd');

	let section = clean_uci_value(config.section || first_uci_section('uhttpd', 'cert') || '');

	if (!length(section) || uci.get('uhttpd', section) != 'cert')
		section = uci.add('uhttpd', 'cert');

	let next = {
		days: clean_uci_value(config.days || ''),
		key_type: clean_uci_value(config.key_type || 'ec'),
		bits: clean_uci_value(config.bits || ''),
		ec_curve: clean_uci_value(config.ec_curve || ''),
		country: clean_uci_value(config.country || ''),
		state: clean_uci_value(config.state || ''),
		location: clean_uci_value(config.location || ''),
		organization: clean_uci_value(config.organization || ''),
		commonname: clean_uci_value(config.commonname || '')
	};

	if (!valid_numeric_value(next.days) || !valid_numeric_value(next.bits))
		return {
			saved: false,
			message: 'Certificate days and bits must be numeric.',
			changed: false,
			sections: collect_system_settings_sections()
		};

	if (next.key_type != 'ec' && next.key_type != 'rsa')
		return {
			saved: false,
			message: 'Certificate key type must be EC or RSA.',
			changed: false,
			sections: collect_system_settings_sections()
		};

	if (length(next.country) > 2 || replace(next.country, /[^A-Za-z]/g, '') != next.country)
		return {
			saved: false,
			message: 'Certificate country must be a two-letter code.',
			changed: false,
			sections: collect_system_settings_sections()
		};

	for (let key in ['ec_curve', 'state', 'location', 'organization', 'commonname']) {
		let value = next[key];

		if (replace(value, /[^A-Za-z0-9 .,:_@/+()-]/g, '') != value)
			return {
				saved: false,
				message: 'Certificate text fields contain unsupported characters.',
				changed: false,
				sections: collect_system_settings_sections()
			};
	}

	let changed = false;

	for (let key, value in next) {
		let current = uci.get('uhttpd', section, key) || '';

		if (current != value) {
			changed = true;
			set_uci_option('uhttpd', section, key, value);
		}
	}

	if (changed) {
		uci.commit('uhttpd');
		system('/etc/init.d/uhttpd reload >/dev/null 2>&1 || /etc/init.d/uhttpd restart >/dev/null 2>&1');
	}

	return {
		saved: true,
		message: changed ? 'Certificate defaults saved and web server reloaded.' : 'Certificate defaults already up to date.',
		changed,
		sections: collect_system_settings_sections()
	};
}

function banip_save_sections() {
	return collect_uci_config('banip', ['banip']);
}

function banip_save_state() {
	let sections = banip_save_sections();

	return {
		section: sections?.[0] || null,
		sections
	};
}

function uhttpd_cert_file_status(path, title) {
	path = clean_uci_value(path || '');
	let info = length(path) ? stat(path) : null;

	return {
		title,
		path,
		exists: info?.type == 'file',
		size: info?.size || 0
	};
}

function uhttpd_cert_result(saved, message, changed, extra) {
	uci.load('uhttpd');
	let sections = collect_uci_config('uhttpd', ['uhttpd']);
	let main = sections?.[0] || null;
	let cert = main?.values?.cert || '';
	let key = main?.values?.key || '';

	let result = {
		saved,
		message,
		changed,
		section: main,
		sections,
		files: [
			uhttpd_cert_file_status(cert, 'HTTPS certificate'),
			uhttpd_cert_file_status(key, 'HTTPS private key')
		],
		init: fast_service_state('uhttpd')
	};

	if (extra)
		for (let k, v in extra)
			result[k] = v;

	return result;
}

function safe_uhttpd_upload_path(filename, kind) {
	filename = clean_uci_value(filename || '');
	let parts = split(filename, '/');
	filename = parts[length(parts) - 1] || '';
	filename = replace(filename, /[^A-Za-z0-9_.-]/g, '-');

	if (!length(filename))
		filename = kind == 'key' ? 'i-love-luci-uhttpd.key' : 'i-love-luci-uhttpd.crt';

	return '/etc/luci-uploads/' + filename;
}

function save_uhttpd_certificate_file(kind, filename, text, encoding) {
	kind = kind == 'key' ? 'key' : 'cert';
	encoding = encoding == 'base64' ? 'base64' : 'text';
	text = encoding == 'base64' ? base64_decode(text) : ('' + (text || ''));

	if (!length(trim(text)))
		return uhttpd_cert_result(false, 'Certificate file content is empty.', false, null);

	if (length(text) > 131072)
		return uhttpd_cert_result(false, 'Certificate file is too large.', false, null);

	if (encoding != 'base64' && kind == 'cert' && !match(text, /-----BEGIN [A-Z ]*CERTIFICATE-----/))
		return uhttpd_cert_result(false, 'Certificate upload currently expects PEM text.', false, null);

	if (encoding != 'base64' && kind == 'key' && !match(text, /-----BEGIN [A-Z ]*PRIVATE KEY-----/))
		return uhttpd_cert_result(false, 'Private key upload currently expects PEM text.', false, null);

	let path = safe_uhttpd_upload_path(filename, kind);
	let current = readfile(path) || '';
	let changed = current != text;

	if (changed) {
		system('mkdir -p /etc/luci-uploads >/dev/null 2>&1');
		writefile(path, text);
		system('chmod 0600 ' + quote_command_args([path])[0] + ' >/dev/null 2>&1 || true');
	}

	return uhttpd_cert_result(true, changed ? 'Certificate file uploaded.' : 'Certificate file already up to date.', changed, {
		kind,
		path,
		encoding,
		size: length(text)
	});
}

function removable_uhttpd_cert_path(path) {
	path = clean_uci_value(path || '');

	if (!length(path))
		return false;

	return path == '/etc/uhttpd.crt' || path == '/etc/uhttpd.key' || index(path, '/etc/luci-uploads/') == 0;
}

function remove_uhttpd_certificate_files(action, confirm) {
	action = action == 'remove_config' ? 'remove_config' : 'remove_files';

	if (confirm != 'remove')
		return uhttpd_cert_result(false, 'Certificate removal requires confirmation.', false, null);

	uci.load('uhttpd');
	let section = first_uci_section('uhttpd', 'uhttpd') || 'main';
	let cert = uci.get('uhttpd', section, 'cert') || '';
	let key = uci.get('uhttpd', section, 'key') || '';
	let changed = false;

	for (let path in [cert, key]) {
		if (removable_uhttpd_cert_path(path)) {
			system('rm -f -- ' + quote_command_args([path])[0] + ' >/dev/null 2>&1 || true');
			changed = true;
		}
	}

	if (action == 'remove_config') {
		if (length(cert)) {
			uci.delete('uhttpd', section, 'cert');
			changed = true;
		}

		if (length(key)) {
			uci.delete('uhttpd', section, 'key');
			changed = true;
		}

		if (uci.get('uhttpd', section, 'listen_https')) {
			uci.delete('uhttpd', section, 'listen_https');
			changed = true;
		}

		if (changed)
			uci.commit('uhttpd');
	}

	if (changed)
		system('/etc/init.d/uhttpd restart >/dev/null 2>&1 || true');

	return uhttpd_cert_result(true, changed ? 'Certificate files removed and web server restarted.' : 'Certificate files already absent.', changed, null);
}

function save_banip_config(config) {
	config ||= {};
	uci.load('banip');

	let section = first_uci_section('banip', 'banip') || uci.add('banip', 'banip');
	let next = {
		ban_enabled: zero_one(config.ban_enabled),
		ban_autodetect: zero_one(config.ban_autodetect),
		ban_autoallowlist: zero_one(config.ban_autoallowlist),
		ban_autoblocklist: zero_one(config.ban_autoblocklist),
		ban_allowlistonly: zero_one(config.ban_allowlistonly),
		ban_protov4: zero_one(config.ban_protov4),
		ban_protov6: zero_one(config.ban_protov6),
		ban_blockpolicy: clean_uci_value(config.ban_blockpolicy || ''),
		ban_nftpolicy: clean_uci_value(config.ban_nftpolicy || ''),
		ban_nftpriority: clean_uci_value(config.ban_nftpriority || ''),
		ban_nftloglevel: clean_uci_value(config.ban_nftloglevel || ''),
		ban_loglimit: clean_uci_value(config.ban_loglimit || ''),
		ban_fetchretry: clean_uci_value(config.ban_fetchretry || ''),
		ban_icmplimit: clean_uci_value(config.ban_icmplimit || ''),
		ban_synlimit: clean_uci_value(config.ban_synlimit || ''),
		ban_udplimit: clean_uci_value(config.ban_udplimit || ''),
		ban_feed: split_uci_lines(config.ban_feed || ''),
		ban_country: split_uci_lines(config.ban_country || ''),
		ban_trigger: split_uci_lines(config.ban_trigger || ''),
		ban_ifv4: split_uci_lines(config.ban_ifv4 || ''),
		ban_ifv6: split_uci_lines(config.ban_ifv6 || ''),
		ban_dev: split_uci_lines(config.ban_dev || ''),
		ban_logterm: split_uci_lines(config.ban_logterm || '')
	};

	if (next.ban_blockpolicy != '' && next.ban_blockpolicy != 'drop' && next.ban_blockpolicy != 'reject')
		return {
			saved: false,
			message: 'banIP block policy must be drop or reject.',
			changed: false,
			...banip_save_state()
		};

	if (next.ban_nftpolicy != '' && next.ban_nftpolicy != 'memory' && next.ban_nftpolicy != 'performance')
		return {
			saved: false,
			message: 'banIP nft policy must be memory or performance.',
			changed: false,
			...banip_save_state()
		};

	if (!valid_signed_numeric_value(next.ban_nftpriority) || !valid_numeric_value(next.ban_loglimit) || !valid_numeric_value(next.ban_fetchretry) || !valid_numeric_value(next.ban_icmplimit) || !valid_numeric_value(next.ban_synlimit) || !valid_numeric_value(next.ban_udplimit))
		return {
			saved: false,
			message: 'banIP numeric limits contain unsupported values.',
			changed: false,
			...banip_save_state()
		};

	for (let key in ['ban_nftloglevel']) {
		let value = next[key];

		if (replace(value, /[^A-Za-z0-9_.:-]/g, '') != value)
			return {
				saved: false,
				message: 'banIP log level contains unsupported characters.',
				changed: false,
				...banip_save_state()
			};
	}

	for (let key in ['ban_feed', 'ban_country', 'ban_trigger', 'ban_ifv4', 'ban_ifv6', 'ban_dev']) {
		for (let value in next[key]) {
			if (replace(value, /[^A-Za-z0-9_.:-]/g, '') != value)
				return {
					saved: false,
					message: 'banIP list fields contain unsupported characters.',
					changed: false,
					...banip_save_state()
				};
		}
	}

	for (let value in next.ban_logterm) {
		if (replace(value, /[^A-Za-z0-9 .,:_@/+()-]/g, '') != value)
			return {
				saved: false,
				message: 'banIP log terms contain unsupported characters.',
				changed: false,
				...banip_save_state()
			};
	}

	let changed = false;

	for (let key, value in next) {
		let current = uci.get('banip', section, key) || '';

		if (type(value) == 'array') {
			if (!uci_list_equal(current, value)) {
				changed = true;
				set_uci_option('banip', section, key, value);
			}
			continue;
		}

		if (current != value) {
			changed = true;
			set_uci_option('banip', section, key, value);
		}
	}

	if (changed) {
		uci.commit('banip');
		system('/etc/init.d/banip reload >/dev/null 2>&1 || /etc/init.d/banip restart >/dev/null 2>&1 || true');
	}

	return {
		saved: true,
		message: changed ? 'banIP settings saved and reloaded.' : 'banIP settings already up to date.',
		changed,
		...banip_save_state()
	};
}

function adblock_fast_feed_rows() {
	let rows = [];

	try {
		uci.load('adblock-fast');
	}
	catch (e) {
		return rows;
	}

	uci.foreach('adblock-fast', 'file_url', function(section) {
		push(rows, {
			section: section['.name'] || '',
			enabled: section.enabled == '0' ? '0' : '1',
			action: section.action || 'block',
			name: section.name || '',
			url: section.url || '',
			size: section.size || ''
		});
	});

	return rows;
}

function adblock_fast_save_state() {
	return {
		config: (collect_uci_config('adblock-fast', ['adblock-fast']) || [])[0] || null,
		feeds: adblock_fast_feed_rows(),
		sections: collect_uci_config('adblock-fast', ['adblock-fast', 'file_url'])
	};
}

function save_adblock_fast_config(config, feeds) {
	config ||= {};
	feeds ||= [];
	uci.load('adblock-fast');

	let config_section = first_uci_section('adblock-fast', 'adblock-fast') || uci.add('adblock-fast', 'adblock-fast');
	let allowed_domains = split_uci_lines(config.allowed_domain || '');
	let blocked_domains = split_uci_lines(config.blocked_domain || '');
	let dnsmasq_instances = split_uci_lines(config.dnsmasq_instance || '');
	let force_dns_ports = split_uci_lines(config.force_dns_port || '');
	let next_config = {
		enabled: zero_one(config.enabled),
		dns: clean_uci_value(config.dns || ''),
		dnsmasq_config_file_url: clean_uci_value(config.dnsmasq_config_file_url || ''),
		dnsmasq_instance: dnsmasq_instances,
		force_dns: zero_one(config.force_dns),
		force_dns_port: force_dns_ports,
		parallel_downloads: clean_uci_value(config.parallel_downloads || ''),
		verbosity: clean_uci_value(config.verbosity || ''),
		auto_update_enabled: zero_one(config.auto_update_enabled),
		config_update_enabled: zero_one(config.config_update_enabled),
		config_update_url: clean_uci_value(config.config_update_url || ''),
		ipv6_enabled: zero_one(config.ipv6_enabled),
		download_timeout: clean_uci_value(config.download_timeout || ''),
		pause_timeout: clean_uci_value(config.pause_timeout || ''),
		curl_max_file_size: clean_uci_value(config.curl_max_file_size || ''),
		curl_retry: clean_uci_value(config.curl_retry || ''),
		compressed_cache: zero_one(config.compressed_cache),
		compressed_cache_dir: clean_uci_value(config.compressed_cache_dir || ''),
		dnsmasq_sanity_check: zero_one(config.dnsmasq_sanity_check),
		dnsmasq_validity_check: zero_one(config.dnsmasq_validity_check),
		debug_init_script: zero_one(config.debug_init_script),
		rpcd_token: clean_uci_value(config.rpcd_token || ''),
		led: clean_uci_value(config.led || ''),
		allowed_domain: allowed_domains,
		blocked_domain: blocked_domains
	};

	if (!length(next_config.dns) || replace(next_config.dns, /[^A-Za-z0-9_.-]/g, '') != next_config.dns)
		return {
			saved: false,
			message: 'AdBlock Fast DNS backend is required.',
			changed: false,
			...adblock_fast_save_state()
		};

	for (let key in ['parallel_downloads', 'verbosity', 'download_timeout', 'pause_timeout', 'curl_max_file_size', 'curl_retry']) {
		if (!valid_numeric_value(next_config[key]))
			return {
				saved: false,
				message: 'AdBlock Fast numeric settings must be numeric.',
				changed: false,
				...adblock_fast_save_state()
			};
	}

	for (let key in ['compressed_cache_dir']) {
		if (replace(next_config[key], /[^A-Za-z0-9_./:-]/g, '') != next_config[key])
			return {
				saved: false,
				message: 'AdBlock Fast path settings contain unsupported characters.',
				changed: false,
				...adblock_fast_save_state()
			};
	}

	for (let key in ['dnsmasq_config_file_url', 'config_update_url']) {
		if (replace(next_config[key], /[^A-Za-z0-9_./:?=&%#@+~,;!$*'()[\\]-]/g, '') != next_config[key])
			return {
				saved: false,
				message: 'AdBlock Fast URL settings contain unsupported characters.',
				changed: false,
				...adblock_fast_save_state()
			};
	}

	if (replace(next_config.led, /[^A-Za-z0-9_.:-]/g, '') != next_config.led)
		return {
			saved: false,
			message: 'AdBlock Fast LED contains unsupported characters.',
			changed: false,
			...adblock_fast_save_state()
		};

	if (replace(next_config.rpcd_token, /[^A-Za-z0-9_.:@/+()-]/g, '') != next_config.rpcd_token)
		return {
			saved: false,
			message: 'AdBlock Fast RPC token contains unsupported characters.',
			changed: false,
			...adblock_fast_save_state()
		};

	for (let domain in allowed_domains)
		if (!length(domain) || replace(domain, /[^A-Za-z0-9_.:-]/g, '') != domain)
			return {
				saved: false,
				message: 'Allowed domain entries contain unsupported characters.',
				changed: false,
				...adblock_fast_save_state()
			};

	for (let domain in blocked_domains)
		if (!length(domain) || replace(domain, /[^A-Za-z0-9_.:-]/g, '') != domain)
			return {
				saved: false,
				message: 'Blocked domain entries contain unsupported characters.',
				changed: false,
				...adblock_fast_save_state()
			};

	for (let instance in dnsmasq_instances)
		if (!length(instance) || replace(instance, /[^A-Za-z0-9_.*+-]/g, '') != instance)
			return {
				saved: false,
				message: 'dnsmasq instance entries contain unsupported characters.',
				changed: false,
				...adblock_fast_save_state()
			};

	for (let port in force_dns_ports)
		if (!valid_numeric_value(port))
			return {
				saved: false,
				message: 'Force DNS ports must be numeric.',
				changed: false,
				...adblock_fast_save_state()
			};

	let existing = {};
	let existing_order = [];
	uci.foreach('adblock-fast', 'file_url', function(section) {
		existing[section['.name']] = true;
		push(existing_order, section['.name']);
	});

	let keep = {};
	let next_order = [];
	let validated = [];

	for (let row in feeds) {
		let section = clean_uci_value(row?.section || '');
		let is_existing = length(section) && existing[section] == true;
		let next = {
			enabled: zero_one(row?.enabled),
			action: row?.action == 'allow' ? 'allow' : 'block',
			name: clean_uci_value(row?.name || ''),
			url: clean_uci_value(row?.url || ''),
			size: clean_uci_value(row?.size || '')
		};

		if (length(section) && !is_existing)
			return {
				saved: false,
				message: 'AdBlock Fast feed no longer exists. Refresh and try again.',
				changed: false,
				...adblock_fast_save_state()
			};

		if (!length(next.name) || !length(next.url))
			return {
				saved: false,
				message: 'AdBlock Fast feed name and URL are required.',
				changed: false,
				...adblock_fast_save_state()
			};

		if (replace(next.name, /[^A-Za-z0-9 .,:_@/+()-]/g, '') != next.name || replace(next.url, /[^A-Za-z0-9_./:?=&%#@+~,;!$*'()[\\]-]/g, '') != next.url)
			return {
				saved: false,
				message: 'AdBlock Fast feed fields contain unsupported characters.',
				changed: false,
				...adblock_fast_save_state()
			};

		if (!valid_numeric_value(next.size))
			return {
				saved: false,
				message: 'AdBlock Fast feed size must be numeric.',
				changed: false,
				...adblock_fast_save_state()
			};

		push(validated, {
			section,
			is_existing,
			next
		});
	}

	let changed = false;
	let config_changed = false;
	let preserve_missing_default = {
		auto_update_enabled: '0',
		config_update_enabled: '0',
		compressed_cache: '0',
		debug_init_script: '0',
		dnsmasq_sanity_check: '1',
		dnsmasq_validity_check: '0',
		ipv6_enabled: '0'
	};

	for (let key, value in next_config) {
		let current = uci.get('adblock-fast', config_section, key) || '';

		if (key == 'allowed_domain' || key == 'blocked_domain' || key == 'dnsmasq_instance' || key == 'force_dns_port') {
			if (!uci_list_equal(current, value)) {
				changed = true;
				config_changed = true;
				set_uci_option('adblock-fast', config_section, key, value);
			}
			continue;
		}

		if (!length(current) && preserve_missing_default[key] != null && value == preserve_missing_default[key])
			continue;

		if (current != value) {
			changed = true;
			config_changed = true;
			set_uci_option('adblock-fast', config_section, key, value);
		}
	}

	for (let item in validated) {
		let section = item.section;

		if (!item.is_existing) {
			section = uci.add('adblock-fast', 'file_url');
			changed = true;
			config_changed = true;
		}

		keep[section] = true;
		push(next_order, section);

		for (let key, value in item.next) {
			let current = uci.get('adblock-fast', section, key) || '';

			if (key == 'enabled') {
				value = value == '0' ? '0' : '';
			}

			if (current != value) {
				changed = true;
				config_changed = true;
				set_uci_option('adblock-fast', section, key, value);
			}
		}
	}

	for (let section in existing) {
		if (!keep[section]) {
			uci.delete('adblock-fast', section);
			changed = true;
			config_changed = true;
		}
	}

	let current_order = [];
	for (let section in existing_order)
		if (keep[section])
			push(current_order, section);

	let order_changed = length(current_order) != length(next_order);
	if (!order_changed) {
		for (let i = 0; i < length(next_order); i++) {
			if (current_order[i] != next_order[i]) {
				order_changed = true;
				break;
			}
		}
	}

	if (order_changed)
		changed = true;

	if (changed) {
		if (config_changed)
			uci.commit('adblock-fast');

		if (order_changed) {
			for (let i = 0; i < length(next_order); i++) {
				let section = next_order[i];

				if (replace(section, /[^A-Za-z0-9_.-]/g, '') == section)
					system('uci reorder adblock-fast.' + section + '=' + i + ' >/dev/null 2>&1 || true');
			}

			system('uci commit adblock-fast >/dev/null 2>&1 || true');
		}

		system('/etc/init.d/adblock-fast reload >/dev/null 2>&1 || /etc/init.d/adblock-fast restart >/dev/null 2>&1 || true');
	}

	return {
		saved: true,
		message: changed ? 'AdBlock Fast settings saved and reloaded.' : 'AdBlock Fast settings already up to date.',
		changed,
		...adblock_fast_save_state()
	};
}

function upnpd_rule_rows() {
	let rows = [];

	try {
		uci.load('upnpd');
	}
	catch (e) {
		return rows;
	}

	uci.foreach('upnpd', 'perm_rule', function(section) {
		push(rows, {
			section: section['.name'] || '',
			action: section.action || 'allow',
			ext_ports: section.ext_ports || '',
			int_addr: section.int_addr || '',
			int_ports: section.int_ports || '',
			comment: section.comment || ''
		});
	});

	return rows;
}

function upnpd_active_rules() {
	try {
		let status = ubus.call('luci.upnp', 'get_status', {}) || {};
		return status.rules || [];
	}
	catch (e) {
		return [];
	}
}

function upnpd_delete_active_rule(token) {
	token = clean_uci_value(token || '');

	if (!length(token) || replace(token, /[^0-9]/g, '') != token || +token < 1)
		return {
			ok: false,
			message: 'UPnP active rule token is invalid.',
			activeRules: []
		};

	let rules = upnpd_active_rules();
	let exists = false;

	for (let rule in rules) {
		if ('' + (rule?.num || '') == token) {
			exists = true;
			break;
		}
	}

	if (!exists)
		return {
			ok: false,
			message: 'UPnP active rule is no longer present.',
			activeRules: rules
		};

	try {
		let result = ubus.call('luci.upnp', 'delete_rule', { token }) || {};
		return {
			ok: result.result == 'OK',
			message: result.result == 'OK' ? 'UPnP port map deleted.' : 'UPnP port map delete failed.',
			activeRules: upnpd_active_rules()
		};
	}
	catch (e) {
		return {
			ok: false,
			message: 'UPnP port map delete failed: ' + e,
			activeRules: upnpd_active_rules()
		};
	}
}

function save_upnpd_config(config, rows) {
	config ||= {};
	rows ||= [];
	uci.load('upnpd');

	let config_section = first_uci_section('upnpd', 'upnpd') || uci.add('upnpd', 'upnpd');
	let next_config = {
		enabled: zero_one(config.enabled),
		download: clean_uci_value(config.download || ''),
		upload: clean_uci_value(config.upload || ''),
		internal_iface: clean_uci_value(config.internal_iface || ''),
		port: clean_uci_value(config.port || ''),
		igdv1: zero_one(config.igdv1),
		enable_upnp: clean_uci_value(config.enable_upnp || ''),
		enable_natpmp: clean_uci_value(config.enable_natpmp || ''),
		use_stun: clean_uci_value(config.use_stun || ''),
		stun_host: clean_uci_value(config.stun_host || ''),
		stun_port: clean_uci_value(config.stun_port || ''),
		secure_mode: clean_uci_value(config.secure_mode || ''),
		notify_interval: clean_uci_value(config.notify_interval || ''),
		presentation_url: clean_uci_value(config.presentation_url || ''),
		uuid: clean_uci_value(config.uuid || ''),
		model_number: clean_uci_value(config.model_number || ''),
		serial_number: clean_uci_value(config.serial_number || ''),
		system_uptime: clean_uci_value(config.system_uptime || ''),
		log_output: clean_uci_value(config.log_output || ''),
		upnp_lease_file: clean_uci_value(config.upnp_lease_file || '')
	};

	if (!valid_numeric_value(next_config.download) || !valid_numeric_value(next_config.upload) || !valid_numeric_value(next_config.port) || !valid_numeric_value(next_config.stun_port) || !valid_numeric_value(next_config.notify_interval))
		return {
			saved: false,
			message: 'UPnP bandwidth, port, STUN port, and interval values must be numeric.',
			changed: false,
			config: (collect_uci_config('upnpd', ['upnpd']) || [])[0] || null,
			rules: upnpd_rule_rows(),
			sections: collect_uci_config('upnpd', ['upnpd', 'perm_rule'])
		};

	for (let key in ['enable_upnp', 'enable_natpmp', 'use_stun', 'secure_mode', 'system_uptime', 'log_output']) {
		let value = next_config[key];

		if (value != '' && value != '0' && value != '1')
			return {
				saved: false,
				message: 'UPnP boolean options must be enabled, disabled, or default.',
				changed: false,
				config: (collect_uci_config('upnpd', ['upnpd']) || [])[0] || null,
				rules: upnpd_rule_rows(),
				sections: collect_uci_config('upnpd', ['upnpd', 'perm_rule'])
			};
	}

	for (let key in ['internal_iface', 'stun_host', 'uuid', 'model_number', 'serial_number']) {
		let value = next_config[key];

		if (length(value) && replace(value, /[^A-Za-z0-9_.:-]/g, '') != value)
			return {
				saved: false,
				message: 'UPnP identifier fields contain unsupported characters.',
				changed: false,
				config: (collect_uci_config('upnpd', ['upnpd']) || [])[0] || null,
				rules: upnpd_rule_rows(),
				sections: collect_uci_config('upnpd', ['upnpd', 'perm_rule'])
			};
	}

	if (!length(next_config.internal_iface))
		return {
			saved: false,
			message: 'UPnP internal interface is required.',
			changed: false,
			config: (collect_uci_config('upnpd', ['upnpd']) || [])[0] || null,
			rules: upnpd_rule_rows(),
			sections: collect_uci_config('upnpd', ['upnpd', 'perm_rule'])
		};

	for (let key in ['presentation_url', 'upnp_lease_file']) {
		let value = next_config[key];

		if (length(value) && replace(value, /[^A-Za-z0-9_./:?=&%#@+~,;!$*'()[\]-]/g, '') != value)
			return {
				saved: false,
				message: 'UPnP URL and file fields contain unsupported characters.',
				changed: false,
				config: (collect_uci_config('upnpd', ['upnpd']) || [])[0] || null,
				rules: upnpd_rule_rows(),
				sections: collect_uci_config('upnpd', ['upnpd', 'perm_rule'])
			};
	}

	let existing = {};
	let existing_order = [];
	uci.foreach('upnpd', 'perm_rule', function(section) {
		existing[section['.name']] = true;
		push(existing_order, section['.name']);
	});

	let keep = {};
	let next_order = [];
	let validated = [];

	for (let row in rows) {
		let section = clean_uci_value(row?.section || '');
		let is_existing = length(section) && existing[section] == true;
		let next = {
			action: row?.action == 'deny' ? 'deny' : 'allow',
			ext_ports: clean_uci_value(row?.ext_ports || ''),
			int_addr: clean_uci_value(row?.int_addr || ''),
			int_ports: clean_uci_value(row?.int_ports || ''),
			comment: clean_uci_value(row?.comment || '')
		};

		if (length(section) && !is_existing)
			return {
				saved: false,
				message: 'UPnP permission rule no longer exists. Refresh and try again.',
				changed: false,
				config: (collect_uci_config('upnpd', ['upnpd']) || [])[0] || null,
				rules: upnpd_rule_rows(),
				sections: collect_uci_config('upnpd', ['upnpd', 'perm_rule'])
			};

		if (!length(next.ext_ports) || !length(next.int_addr) || !length(next.int_ports))
			return {
				saved: false,
				message: 'UPnP permission ports and internal address are required.',
				changed: false,
				config: (collect_uci_config('upnpd', ['upnpd']) || [])[0] || null,
				rules: upnpd_rule_rows(),
				sections: collect_uci_config('upnpd', ['upnpd', 'perm_rule'])
			};

		if (replace(next.ext_ports, /[^0-9:-]/g, '') != next.ext_ports || replace(next.int_ports, /[^0-9:-]/g, '') != next.int_ports || replace(next.int_addr, /[^A-Za-z0-9:._/%-]/g, '') != next.int_addr)
			return {
				saved: false,
				message: 'UPnP permission rule fields contain unsupported characters.',
				changed: false,
				config: (collect_uci_config('upnpd', ['upnpd']) || [])[0] || null,
				rules: upnpd_rule_rows(),
				sections: collect_uci_config('upnpd', ['upnpd', 'perm_rule'])
			};

		push(validated, {
			section,
			is_existing,
			next
		});
	}

	let changed = false;
	let config_changed = false;

	for (let key, value in next_config) {
		let current = uci.get('upnpd', config_section, key) || '';

		if (current != value) {
			changed = true;
			config_changed = true;
			set_uci_option('upnpd', config_section, key, value);
		}
	}

	for (let item in validated) {
		let section = item.section;

		if (!item.is_existing) {
			section = uci.add('upnpd', 'perm_rule');
			changed = true;
			config_changed = true;
		}

		keep[section] = true;
		push(next_order, section);

		for (let key, value in item.next) {
			let current = uci.get('upnpd', section, key) || '';

			if (current != value) {
				changed = true;
				config_changed = true;
				set_uci_option('upnpd', section, key, value);
			}
		}
	}

	for (let section in existing) {
		if (!keep[section]) {
			uci.delete('upnpd', section);
			changed = true;
			config_changed = true;
		}
	}

	let current_order = [];
	for (let section in existing_order)
		if (keep[section])
			push(current_order, section);

	let order_changed = length(current_order) != length(next_order);
	if (!order_changed) {
		for (let i = 0; i < length(next_order); i++) {
			if (current_order[i] != next_order[i]) {
				order_changed = true;
				break;
			}
		}
	}

	if (order_changed)
		changed = true;

	if (changed) {
		if (config_changed)
			uci.commit('upnpd');

		if (order_changed) {
			for (let i = 0; i < length(next_order); i++) {
				let section = next_order[i];

				if (replace(section, /[^A-Za-z0-9_.-]/g, '') == section)
					system('uci reorder upnpd.' + section + '=' + i + ' >/dev/null 2>&1 || true');
			}

			system('uci commit upnpd >/dev/null 2>&1 || true');
		}

		system('/etc/init.d/miniupnpd reload >/dev/null 2>&1 || /etc/init.d/miniupnpd restart >/dev/null 2>&1 || true');
	}

	return {
		saved: true,
		message: changed ? 'UPnP settings saved and reloaded.' : 'UPnP settings already up to date.',
		changed,
		config: (collect_uci_config('upnpd', ['upnpd']) || [])[0] || null,
		rules: upnpd_rule_rows(),
		sections: collect_uci_config('upnpd', ['upnpd', 'perm_rule'])
	};
}

function set_router_password(username, password, confirm) {
	username = trim('' + (username || 'root'));
	password = '' + (password || '');
	confirm = '' + (confirm || '');

	if (!length(username))
		username = 'root';

	if (username != 'root')
		return {
			saved: false,
			message: 'Only the root password can be changed from this screen.'
		};

	if (!length(password))
		return {
			saved: false,
			message: 'Password is required.'
		};

	if (password != confirm)
		return {
			saved: false,
			message: 'Password confirmation does not match.'
		};

	if (length(password) < 6)
		return {
			saved: false,
			message: 'Password must be at least 6 characters.'
		};

	let result = null;

	try {
		result = ubus.call('luci', 'setPassword', {
			username,
			password
		});
	}
	catch (e) {
		return {
			saved: false,
			message: 'Password change failed.'
		};
	}

	const saved = result?.result == true;

	return {
		saved,
		message: saved ? 'Router password changed.' : 'Password change failed.'
	};
}

function reboot_confirm(confirm) {
	confirm = trim('' + (confirm || ''));

	let board = ubus.call('system', 'board') || {};
	let hostname = board.hostname || '';

	if (!length(hostname) || confirm != hostname)
		return {
			accepted: false,
			message: 'Type the router hostname exactly to confirm reboot.',
			hostname
		};

	system('(sleep 2; reboot) >/dev/null 2>&1 &');

	return {
		accepted: true,
		message: 'Reboot scheduled.',
		hostname,
		delay: 2
	};
}

function create_config_backup(dry_run) {
	if (!command_exists('sysupgrade'))
		return {
			ok: false,
			message: 'sysupgrade helper is not installed.',
			filename: '',
			size: 0,
			mime: 'application/gzip',
			data: ''
		};

	if (dry_run)
		return {
			ok: true,
			message: 'Configuration backup helper is available.',
			filename: '',
			size: 0,
			mime: 'application/gzip',
			data: ''
		};

	let board = ubus.call('system', 'board') || {};
	let hostname = replace(trim('' + (board.hostname || 'openwrt')), /[^A-Za-z0-9_.-]/g, '-');
	let filename = `${hostname}-config-backup-${time()}.tar.gz`;
	let path = `/tmp/${filename}`;
	let list_path = `${path}.list`;
	let quoted = quote_command_args([path])[0];
	let list_quoted = quote_command_args([list_path])[0];
	let code = system(`/sbin/sysupgrade -l 2>/dev/null | sed 's#^/##' > ${list_quoted} && tar -czf ${quoted} -C / -T ${list_quoted} >/dev/null 2>&1`);
	let info = stat(path);
	system(`rm -f ${list_quoted} >/dev/null 2>&1 || true`);

	if (code != 0 || info?.type != 'file') {
		system(`rm -f ${quoted} >/dev/null 2>&1 || true`);
		return {
			ok: false,
			message: 'Configuration backup failed.',
			filename,
			size: 0,
			mime: 'application/gzip',
			data: ''
		};
	}

	if (info.size > 2097152) {
		system(`rm -f ${quoted} >/dev/null 2>&1 || true`);
		return {
			ok: false,
			message: 'Configuration backup is larger than the native download limit.',
			filename,
			size: info.size,
			mime: 'application/gzip',
			data: ''
		};
	}

	let data = base64_encode(readfile(path) || '');
	system(`rm -f ${quoted} >/dev/null 2>&1 || true`);

	return {
		ok: length(data) > 0,
		message: length(data) > 0 ? 'Configuration backup created.' : 'Configuration backup encoding failed.',
		filename,
		size: info.size,
		mime: 'application/gzip',
		data
	};
}

function flash_storage_size(procmtd, procpart) {
	let kernsize = 0;
	let rootsize = 0;
	let wholesize = 0;

	for (let line in split('' + (procmtd || ''), '\n')) {
		let match_line = match(line, /^mtd\d+: ([0-9a-f]+) [0-9a-f]+ "(.+)"$/);
		let size = match_line ? int(match_line[1], 16) : 0;
		let name = match_line ? match_line[2] : '';

		if ((name == 'linux' || name == 'firmware') && size > wholesize)
			wholesize = size;
		else if (name == 'kernel' || name == 'kernel0')
			kernsize = size;
		else if (name == 'rootfs' || name == 'rootfs0' || name == 'ubi' || name == 'ubi0')
			rootsize = size;
	}

	if (wholesize > 0)
		return wholesize;

	if (kernsize > 0 && rootsize > kernsize)
		return kernsize + rootsize;

	for (let line in split('' + (procpart || ''), '\n')) {
		let match_line = match(line, /^\s*\d+\s+\d+\s+(\d+)\s+(\S+)$/);
		if (!match_line)
			continue;

		let size = int(match_line[1], 10);
		let name = match_line[2];

		if (!match(name, /\d/) && size > 2048 && wholesize == 0)
			wholesize = size * 1024;
	}

	return wholesize;
}

function safe_filename(value) {
	value = replace(trim('' + (value || 'openwrt')), /[^A-Za-z0-9_.-]/g, '-');
	return length(value) ? value : 'openwrt';
}

function flash_mtd_blocks(procmtd) {
	let blocks = [];
	let hostname = safe_filename(((ubus.call('system', 'board') || {}).hostname) || 'openwrt');

	for (let line in split('' + (procmtd || ''), '\n')) {
		let match_line = match(line, /^mtd(\d+):\s+([0-9a-f]+)\s+([0-9a-f]+)\s+"(.+?)"$/);
		if (!match_line)
			continue;

		let number = match_line[1];
		let name = match_line[4];

		push(blocks, {
			id: number,
			name,
			size: int(match_line[2], 16),
			eraseSize: int(match_line[3], 16),
			path: `/dev/mtdblock${number}`,
			filename: `${hostname}.mtd${number}.${safe_filename(name)}.bin`
		});
	}

	return blocks;
}

function flash_backup_context() {
	let proc_mtd = readfile('/proc/mtd') || '';
	let proc_partitions = readfile('/proc/partitions') || '';
	let proc_mounts = readfile('/proc/mounts') || '';

	let backup_list = command_exists('sysupgrade') ? split_lines(shell_output('/sbin/sysupgrade -l 2>/dev/null')) : [];

	return {
		available: command_exists('sysupgrade'),
		hasRootfsData: match(proc_mtd, /"rootfs_data"/) || match(proc_mounts, /overlayfs:\/overlay \/ /) ? true : false,
		storageSize: flash_storage_size(proc_mtd, proc_partitions),
		list: backup_list,
		config: readfile('/etc/sysupgrade.conf') || '',
		mtdBlocks: flash_mtd_blocks(proc_mtd)
	};
}

function save_sysupgrade_config(text) {
	text = '' + (text || '');

	if (length(text) > 65536)
		return {
			saved: false,
			message: 'Backup configuration list is too large.',
			changed: false,
			config: readfile('/etc/sysupgrade.conf') || ''
		};

	let normalized = replace(text, /\r\n/g, '\n');
	normalized = replace(normalized, /\r/g, '\n');

	if (length(normalized) && substr(normalized, length(normalized) - 1) != '\n')
		normalized += '\n';

	let current = readfile('/etc/sysupgrade.conf') || '';
	let changed = current != normalized;

	if (changed) {
		writefile('/etc/sysupgrade.conf', normalized);
		system('chmod 0644 /etc/sysupgrade.conf >/dev/null 2>&1 || true');
	}

	return {
		saved: true,
		message: changed ? 'Backup configuration list saved.' : 'Backup configuration list already up to date.',
		changed,
		config: normalized
	};
}

function restore_backup_validate(filename, data) {
	if (length('' + (data || '')) > 12 * 1024 * 1024)
		return {
			ok: false,
			message: 'Backup archive exceeds the native restore upload limit.',
			filename: safe_filename(filename || 'backup.tar.gz'),
			entries: []
		};

	let decoded = base64_decode(data);

	if (!length(decoded))
		return {
			ok: false,
			message: 'Backup archive is empty or invalid.',
			filename: safe_filename(filename || 'backup.tar.gz'),
			entries: []
		};

	if (length(decoded) > 8 * 1024 * 1024)
		return {
			ok: false,
			message: 'Backup archive exceeds the native restore upload limit.',
			filename: safe_filename(filename || 'backup.tar.gz'),
			entries: []
		};

	let path = '/tmp/i-love-luci-restore-backup.tar.gz';
	let quoted = quote_command_args([path])[0];

	writefile(path, decoded);
	system(`chmod 0600 ${quoted} >/dev/null 2>&1 || true`);

	let output = shell_output(`/bin/tar -tzf ${quoted} 2>&1 | sed -n "1,300p"`);
	let code = system(`/bin/tar -tzf ${quoted} >/dev/null 2>&1`);

	if (code != 0) {
		system(`rm -f ${quoted} >/dev/null 2>&1 || true`);
		return {
			ok: false,
			message: 'Uploaded backup archive is not readable.',
			filename: safe_filename(filename || 'backup.tar.gz'),
			entries: split_lines(output)
		};
	}

	return {
		ok: true,
		message: 'Backup archive is valid. Continue only if you intend to restore and reboot.',
		filename: safe_filename(filename || 'backup.tar.gz'),
		entries: split_lines(output)
	};
}

function restore_backup_apply(confirm) {
	if (confirm != 'restore-backup')
		return {
			accepted: false,
			message: 'Restore refused. Exact confirmation is required.'
		};

	let path = '/tmp/i-love-luci-restore-backup.tar.gz';
	let quoted = quote_command_args([path])[0];
	let info = stat(path);

	if (info?.type != 'file')
		return {
			accepted: false,
			message: 'No validated backup archive is staged.'
		};

	let code = system(`/sbin/sysupgrade --restore-backup ${quoted} >/tmp/i-love-luci-restore.log 2>&1`);
	if (code != 0)
		return {
			accepted: false,
			message: 'Restore command failed.',
			output: readfile('/tmp/i-love-luci-restore.log') || ''
		};

	system('/sbin/reboot >/dev/null 2>&1 &');
	return {
		accepted: true,
		message: 'Backup restore accepted. Router is rebooting.'
	};
}

function firstboot_apply(confirm) {
	if (confirm != 'erase-settings')
		return {
			accepted: false,
			message: 'Factory reset refused. Exact confirmation is required.'
		};

	system('/sbin/firstboot -r -y >/dev/null 2>&1 &');
	return {
		accepted: true,
		message: 'Factory reset accepted. Router is rebooting.'
	};
}

function mtdblock_download(id) {
	id = '' + (id || '');

	let selected = null;
	for (let block in flash_mtd_blocks(readfile('/proc/mtd') || '')) {
		if (block.id == id) {
			selected = block;
			break;
		}
	}

	if (!selected)
		return {
			ok: false,
			message: 'Unknown MTD block.',
			filename: '',
			size: 0,
			mime: 'application/octet-stream',
			data: ''
		};

	let path = selected.path;
	let info = stat(path);

	if (info?.type != 'block')
		return {
			ok: false,
			message: 'MTD block device is not available.',
			filename: selected.filename,
			size: 0,
			mime: 'application/octet-stream',
			data: ''
		};

	if (selected.size > 8 * 1024 * 1024)
		return {
			ok: false,
			message: 'MTD block is larger than the native download limit.',
			filename: selected.filename,
			size: selected.size,
			mime: 'application/octet-stream',
			data: ''
		};

	let data = base64_encode(readfile(path) || '');

	return {
		ok: length(data) > 0,
		message: length(data) > 0 ? 'MTD block captured.' : 'MTD block read failed.',
		filename: selected.filename,
		size: selected.size,
		mime: 'application/octet-stream',
		data
	};
}

function firmware_validate(filename, data) {
	if (!command_exists('sysupgrade'))
		return {
			ok: false,
			message: 'sysupgrade is not available on this target.',
			filename: safe_filename(filename || 'firmware.bin'),
			size: 0,
			checksum: '',
			sha256sum: '',
			valid: false,
			forceable: false,
			allowBackup: false,
			tooBig: false,
			output: ''
		};

	if (length('' + (data || '')) > 96 * 1024 * 1024)
		return {
			ok: false,
			message: 'Firmware image exceeds the native ubus upload limit. Use LuCI compat for large firmware images.',
			filename: safe_filename(filename || 'firmware.bin'),
			size: 0,
			checksum: '',
			sha256sum: '',
			valid: false,
			forceable: false,
			allowBackup: false,
			tooBig: false,
			output: ''
		};

	let decoded = base64_decode(data);
	if (!length(decoded))
		return {
			ok: false,
			message: 'Firmware image is empty or invalid.',
			filename: safe_filename(filename || 'firmware.bin'),
			size: 0,
			checksum: '',
			sha256sum: '',
			valid: false,
			forceable: false,
			allowBackup: false,
			tooBig: false,
			output: ''
		};

	let path = '/tmp/i-love-luci-firmware.bin';
	let quoted = quote_command_args([path])[0];

	writefile(path, decoded);
	system(`chmod 0600 ${quoted} >/dev/null 2>&1 || true`);

	let info = stat(path);
	let board = ubus.call('system', 'board') || {};
	let validation = ubus.call('system', 'validate_firmware_image', { path }) || {};
	let test_output = shell_output(`/sbin/sysupgrade --test ${quoted} 2>&1 | sed -n "1,220p"`);
	let test_code = system(`/sbin/sysupgrade --test ${quoted} >/dev/null 2>&1`);
	let storage = flash_storage_size(readfile('/proc/mtd') || '', readfile('/proc/partitions') || '');
	let size = info?.size || length(decoded);
	let md5 = trim(shell_output(`md5sum ${quoted} 2>/dev/null | awk '{print $1}'`));
	let sha256 = trim(shell_output(`sha256sum ${quoted} 2>/dev/null | awk '{print $1}'`));

	return {
		ok: true,
		message: test_code == 0 && validation.valid ? 'Firmware image passed validation.' : 'Firmware image requires review before flashing.',
		filename: safe_filename(filename || 'firmware.bin'),
		board: board.model || '',
		size,
		checksum: md5,
		sha256sum: sha256,
		valid: validation.valid ? true : false,
		forceable: validation.forceable ? true : false,
		allowBackup: validation.allow_backup ? true : false,
		tooBig: storage > 0 && size > storage,
		output: test_output
	};
}

function firmware_flash(options) {
	options ||= {};

	if (options.confirm != 'flash-firmware')
		return {
			accepted: false,
			message: 'Firmware flash refused. Exact confirmation is required.'
		};

	let path = '/tmp/i-love-luci-firmware.bin';
	let quoted = quote_command_args([path])[0];
	let info = stat(path);

	if (info?.type != 'file')
		return {
			accepted: false,
			message: 'No validated firmware image is staged.'
		};

	let validation = ubus.call('system', 'validate_firmware_image', { path }) || {};
	let storage = flash_storage_size(readfile('/proc/mtd') || '', readfile('/proc/partitions') || '');
	let too_big = storage > 0 && info.size > storage;

	if (too_big)
		return {
			accepted: false,
			message: 'Firmware flash refused. Image is larger than available flash storage.'
		};

	if (!validation.valid && !options.force)
		return {
			accepted: false,
			message: 'Firmware flash refused. Image validation failed.'
		};

	if (options.force && !validation.forceable)
		return {
			accepted: false,
			message: 'Firmware flash refused. This image is not forceable.'
		};

	let args = [];
	if (!options.keep)
		push(args, '-n');
	if (options.force)
		push(args, '--force');
	if (options.keep && options.skipOriginal)
		push(args, '-u');
	if (options.keep && options.backupPackages)
		push(args, '-k');

	push(args, path);

	system('/sbin/sysupgrade ' + join(' ', quote_command_args(args)) + ' >/dev/null 2>&1 &');
	return {
		accepted: true,
		message: 'Firmware flash accepted. Router is flashing and will reboot.'
	};
}

function native_page(page) {
	const board = ubus.call('system', 'board') || {};
	const system_info = ubus.call('system', 'info') || {};

	let data = {
		page,
		board,
		system: system_info,
		commands: [],
		sections: [],
		services: [],
		lines: [],
		text: ''
	};

	if (page == 'status-routes') {
		data.commands = [
			{ title: 'IPv4 routes', output: shell_output('/sbin/ip -4 route show table all') },
			{ title: 'IPv4 rules', output: shell_output('/sbin/ip -4 rule show') },
			{ title: 'IPv4 neighbours', output: shell_output('/sbin/ip -4 neigh show') },
			{ title: 'IPv6 routes', output: shell_output('/sbin/ip -6 route show table all') },
			{ title: 'IPv6 rules', output: shell_output('/sbin/ip -6 rule show') },
			{ title: 'IPv6 neighbours', output: shell_output('/sbin/ip -6 neigh show') }
		];
	}
	else if (page == 'firewall-status') {
		data.commands = [
			{ title: 'nftables ruleset', output: shell_output('nft --terse list ruleset | head -n 500') }
		];
	}
	else if (page == 'logs') {
		data.commands = [
			{ title: 'System log', output: shell_output('logread | tail -n 350') },
			{ title: 'Kernel log', output: shell_output('dmesg | tail -n 350') }
		];
	}
	else if (page == 'processes') {
		data.commands = [
			{ title: 'Processes', output: shell_output('ps w') }
		];
	}
	else if (page == 'connections') {
		data.commands = [
			{ title: 'Active sockets', output: shell_output('ss -tunap | head -n 500') }
		];
	}
	else if (page == 'wireless') {
		data.sections = collect_uci_config('wireless', ['wifi-device', 'wifi-iface']);
		data.commands = [
			{ title: 'Wireless devices', output: command_exists('iw') ? shell_output('iw dev') : 'iw is not installed.' },
			{ title: 'Wireless status', output: command_exists('iwinfo') ? shell_output('iwinfo 2>/dev/null') : 'iwinfo is not installed.' }
		];
	}
	else if (page == 'diagnostics') {
		data.commands = [
			{ title: 'Routing table', output: shell_output('/sbin/ip route show') },
			{ title: 'DNS servers', output: shell_output('cat /tmp/resolv.conf.d/resolv.conf.auto 2>/dev/null || cat /etc/resolv.conf') }
		];
	}
	else if (page == 'attendedsysupgrade') {
		data.sections = attendedsysupgrade_sections();
		data.commands = [
			{ title: 'Current firmware', output: shell_output('cat /etc/openwrt_release') },
			{ title: 'Upgrade helper', output: attendedsysupgrade_helper_status() }
		];
	}
	else if (page == 'packages') {
		data.lines = package_list();
		data.packageAvailable = package_available_list();
		data.packageFeeds = package_feed_rows();
		data.commands = [
			{ title: 'Available upgrades', output: package_upgrades() }
		];
	}
	else if (page == 'startup') {
		data.services = startup_entries();
		data.text = safe_read(rcLocalPath);
	}
	else if (page == 'crontab') {
		data.text = safe_read('/etc/crontabs/root');
	}
	else if (page == 'sshkeys') {
		data.text = safe_read(sshAuthorizedKeysPath);
	}
	else if (page == 'repokeys') {
		data.commands = [
			{
				title: 'Repository public keys',
				output: shell_output('for f in /etc/apk/keys/* /etc/opkg/keys/*; do [ -f "$f" ] || continue; echo "=== $f ==="; ls -l "$f"; sed -n "1,40p" "$f"; echo; done')
			}
		];
	}
	else if (page == 'leds') {
		data.sections = collect_uci_config('system', ['led']);
		data.commands = [
			{
				title: 'LED sysfs state',
				output: shell_output('for f in /sys/class/leds/*; do [ -d "$f" ] || continue; echo "=== ${f##*/} ==="; cat "$f/trigger" 2>/dev/null; printf "brightness: "; cat "$f/brightness" 2>/dev/null; echo; done')
			},
			{
				title: 'Network devices',
				output: shell_output('ls -1 /sys/class/net 2>/dev/null | sort')
			}
		];
	}
	else if (page == 'flash') {
		try {
			data.flashBackup = flash_backup_context();
		}
		catch (e) {
			data.flashBackup = {
				available: command_exists('sysupgrade'),
				hasRootfsData: false,
				storageSize: 0,
				list: [],
				config: readfile('/etc/sysupgrade.conf') || '',
				mtdBlocks: [],
				error: '' + e
			};
		}
		data.commands = [
			{ title: 'Mounted filesystems', output: shell_output('df -h') },
			{ title: 'Flash partitions', output: shell_output('cat /proc/mtd 2>/dev/null || true') }
		];
	}
	else if (page == 'reboot') {
		data.commands = [
			{ title: 'System uptime', output: shell_output('uptime') }
		];
	}
	else if (page == 'services') {
		data.services = service_overview();
	}

	return data;
}

function build_core_settings(page) {
	let data = {
		page,
		network: [],
		dhcp: [],
		dhcpLeases: [],
		dhcpHosts: [],
		dhcpDomains: [],
		dhcpPools: [],
		dhcpRelays: [],
		dhcpBoots: [],
		dhcpBoot6s: [],
		dhcpTags: [],
		dhcpMatches: [],
		dhcpVendorClasses: [],
		dhcpUserClasses: [],
		dhcpStatus: {},
		networkRoutes: [],
		networkRules: [],
		firewall: [],
		firewallFiles: [],
		system: [],
		timezones: {}
	};

	if (page == 'dhcp') {
		data.dhcp = collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd', 'relay', 'boot', 'boot6', 'tag', 'match', 'vendorclass', 'userclass']);
		data.dhcpLeases = dhcp_leases();
		data.dhcpHosts = dhcp_static_hosts();
		data.dhcpDomains = dhcp_domain_records();
		data.dhcpPools = dhcp_pool_rows();
		data.dhcpRelays = dhcp_relay_rows();
		data.dhcpBoots = dhcp_boot_rows();
		data.dhcpBoot6s = dhcp_boot6_rows();
		data.dhcpTags = dhcp_tag_rows();
		data.dhcpMatches = dhcp_match_rows();
		data.dhcpVendorClasses = dhcp_vendorclass_rows();
		data.dhcpUserClasses = dhcp_userclass_rows();
		data.dhcpStatus = dhcp_status();
	}
	else if (page == 'firewall') {
		data.firewall = collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include']);
		data.firewallFiles = firewall_files();
	}
	else if (page == 'network') {
		data.network = collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6']);
		data.networkRoutes = network_route_rows();
		data.networkRules = network_rule_rows();
		data.firewall = collect_uci_config('firewall', ['zone']);
		data.dhcp = collect_uci_config('dhcp', ['dhcp']);
		data.dhcpPools = dhcp_pool_rows();
	}
	else if (page == 'system') {
		data.system = collect_system_settings_sections();
		data.timezones = { UTC: { tzstring: 'UTC0' } };
		for (let section in data.system)
			if (section.type == 'system' && length(section.values?.zonename || ''))
				data.timezones[section.values.zonename] = { tzstring: section.values?.timezone || '' };
	}
	else {
		data.network = collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6']);
		data.networkRoutes = network_route_rows();
		data.networkRules = network_rule_rows();
	}

	return data;
}

function build_menu() {
	let raw = {};
	let modes = load_route_modes();

	for (let file in glob(menuRoot)) {
		let data = read_jsonfile(file, {});

		if (type(data) != 'object')
			continue;

		for (let path, spec in data)
			if (type(spec) == 'object')
				raw[normalize_path(path)] = spec;
	}

	let entries = [];
	let entries_by_path = {};

	for (let path, spec in raw) {
		let action = action_type(spec);
		let parts = split(trim(path, '/'), '/');
		let nativeRoute = nativeRoutes[path] || null;
		let nativeStatus = nativeRoute?.status || 'compat';
		let configuredMode = modes[path] || 'auto';
		let mode = effective_mode(configuredMode, nativeStatus, nativeRoute?.autoMode);
		let entry = {
			id: route_id(path),
			title: spec.title || basename_path(path),
			path,
			parentPath: parent_path(path),
			order: int(spec.order || 1000),
			depth: length(parts),
			actionType: action,
			actionPath: action_path(spec),
			preferredChild: spec?.action?.preferred || null,
			firstChildPath: null,
			firstchildIneligible: spec.firstchild_ineligible == true,
			eligible: depends_satisfied(spec.depends),
			hidden: is_hidden_path(path) || spec.title == null,
			hasChildren: false,
			legacy: mode != 'modern',
			nativeStatus,
			nativeAutoMode: nativeRoute?.autoMode || (nativeStatus == 'supported' ? 'modern' : 'legacy'),
			configuredMode,
			effectiveMode: mode,
			nativePath: nativeStatus == 'supported' ? nativeRoute?.nativePath : null,
			resolvedPath: path
		};

		push(entries, entry);
		entries_by_path[path] = entry;
	}

	for (let entry in entries) {
		entry.firstChildPath = first_child_path(entry, entries);
		entry.resolvedPath = resolve_entry_path(entry, entries_by_path, entries);
	}

	for (let entry in entries)
		if (!entry.hidden && entry.parentPath && entries_by_path[entry.parentPath])
			entries_by_path[entry.parentPath].hasChildren = true;

	for (let entry in entries)
		if (entry.actionType == 'firstchild' && !entry.firstChildPath)
			entry.hidden = true;

	let routes = filter(entries, entry => entry.eligible && !entry.hidden && (entry.title != null));
	let visible = filter(routes, entry => entry.effectiveMode != 'hidden');

	sort(visible, function(a, b) {
		return a.depth == b.depth ? (a.order == b.order ? (a.title > b.title ? 1 : -1) : a.order - b.order) : a.depth - b.depth;
	});

	return {
		items: visible,
		routes,
		tree: build_menu_tree(visible)
	};
}

function set_route_mode(path, mode) {
	if (!routeModes[mode])
		return false;

	if (mode == 'modern' && nativeRoutes[path]?.status != 'supported')
		return false;

	uci.load('i-love-luci');

	let section = null;

	uci.foreach('i-love-luci', 'route', function(s) {
		if (s.path == path)
			section ??= s['.name'];
	});

	if (!section)
		section = uci.add('i-love-luci', 'route');

	uci.set('i-love-luci', section, 'path', path);
	uci.set('i-love-luci', section, 'mode', mode);
	uci.commit('i-love-luci');

	return true;
}

const methods = {
	session_info: {
		call: function() {
			return respond({
				user: 'root',
				packageVersion: installed_package_version('luci-app-i-love-luci'),
				features: {
					mfa: false,
					passkeys: false,
					legacyFrame: true
				}
			});
		}
	},

	menu_tree: {
		call: function() {
			return respond(build_menu());
		}
	},

	route_mode_set: {
		args: {
			path: '',
			mode: 'auto'
		},
		call: function(request) {
			const path = normalize_path(request.args.path);
			const mode = request.args.mode || 'auto';

			return respond({
				saved: set_route_mode(path, mode),
				path,
				mode
			});
		}
	},

	dashboard_status: {
		call: function() {
			const interfaces = ubus.call('network.interface', 'dump') || {};

			return respond({
				collectedAt: time(),
				board: ubus.call('system', 'board') || {},
				system: ubus.call('system', 'info') || {},
				interfaces: interfaces.interface || [],
				devices: ubus.call('network.device', 'status') || {}
			});
		}
	},

	core_settings: {
		args: {
			page: ''
		},
		call: function(request) {
			return respond(build_core_settings(request.args.page || 'network'));
		}
	},

	dhcp_hosts_save: {
		args: {
			rows: []
		},
		call: function(request) {
			try {
				return respond(save_dhcp_static_hosts(request.args.rows || []));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'Static DHCP hosts save failed: ' + e,
					changed: false,
					hosts: dhcp_static_hosts(),
					sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
				});
			}
		}
	},

	dhcp_domains_save: {
		args: {
			rows: []
		},
		call: function(request) {
			try {
				return respond(save_dhcp_domain_records(request.args.rows || []));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'DNS host records save failed: ' + e,
					changed: false,
					domains: dhcp_domain_records(),
					sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
				});
			}
		}
	},

	dhcp_pools_save: {
		args: {
			rows: []
		},
		call: function(request) {
			try {
				return respond(save_dhcp_pools(request.args.rows || []));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'DHCP pools save failed: ' + e,
					changed: false,
					pools: dhcp_pool_rows(),
					sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
				});
			}
		}
	},

	dhcp_relays_save: {
		args: {
			rows: []
		},
		call: function(request) {
			try {
				return respond(save_dhcp_relays(request.args.rows || []));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'DHCP relay save failed: ' + e,
					changed: false,
					relays: dhcp_relay_rows(),
					sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd', 'relay'])
				});
			}
		}
	},

	dhcp_boots_save: {
		args: {
			rows: []
		},
		call: function(request) {
			try {
				return respond(save_dhcp_boots(request.args.rows || []));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'PXE/TFTP boot options save failed: ' + e,
					changed: false,
					boots: dhcp_boot_rows(),
					sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd', 'relay', 'boot', 'boot6'])
				});
			}
		}
	},

	dhcp_boot6s_save: {
		args: {
			rows: []
		},
		call: function(request) {
			try {
				return respond(save_dhcp_boot6s(request.args.rows || []));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'IPv6 PXE boot options save failed: ' + e,
					changed: false,
					boots: dhcp_boot6_rows(),
					sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd', 'relay', 'boot', 'boot6'])
				});
			}
		}
	},

	dhcp_tags_save: {
		args: {
			rows: []
		},
		call: function(request) {
			try {
				return respond(save_dhcp_tags(request.args.rows || []));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'DHCP tag save failed: ' + e,
					changed: false,
					tags: dhcp_tag_rows(),
					sections: dhcp_extended_sections()
				});
			}
		}
	},

	dhcp_matches_save: {
		args: {
			rows: []
		},
		call: function(request) {
			try {
				return respond(save_dhcp_matches(request.args.rows || []));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'DHCP option match save failed: ' + e,
					changed: false,
					matches: dhcp_match_rows(),
					sections: dhcp_extended_sections()
				});
			}
		}
	},

	dhcp_vendorclasses_save: {
		args: {
			rows: []
		},
		call: function(request) {
			try {
				return respond(save_dhcp_vendorclasses(request.args.rows || []));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'DHCP vendor class save failed: ' + e,
					changed: false,
					classes: dhcp_vendorclass_rows(),
					sections: dhcp_extended_sections()
				});
			}
		}
	},

	dhcp_userclasses_save: {
		args: {
			rows: []
		},
		call: function(request) {
			try {
				return respond(save_dhcp_userclasses(request.args.rows || []));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'DHCP user class save failed: ' + e,
					changed: false,
					classes: dhcp_userclass_rows(),
					sections: dhcp_extended_sections()
				});
			}
		}
	},

	dnsmasq_config_save: {
		args: {
			config: {}
		},
		call: function(request) {
			try {
				return respond(save_dnsmasq_config(request.args.config || {}));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'DNS settings save failed: ' + e,
					changed: false,
					section: (collect_uci_config('dhcp', ['dnsmasq']) || [])[0] || null,
					sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
				});
			}
		}
	},

	network_interfaces_save: {
		args: {
			rows: []
		},
		call: function(request) {
			try {
				return respond(save_network_interfaces(request.args.rows || []));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'Network interfaces save failed: ' + e,
					changed: false,
					interfaces: network_interface_rows(),
					sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
				});
			}
		}
	},

	network_interface_action: {
		args: {
			name: '',
			action: ''
		},
		call: function(request) {
			try {
				return respond(network_interface_action(request.args.name || '', request.args.action || 'status'));
			}
			catch (e) {
				return respond({
					ok: false,
					name: request.args.name || '',
					action: request.args.action || 'status',
					message: 'Network interface action failed: ' + e,
					state: null
				});
			}
		}
	},

	network_devices_save: {
		args: {
			rows: []
		},
		call: function(request) {
			try {
				return respond(save_network_devices(request.args.rows || []));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'Network devices save failed: ' + e,
					changed: false,
					devices: network_device_rows(),
					sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
				});
			}
		}
	},

	odhcpd_config_save: {
		args: {
			config: {}
		},
		call: function(request) {
			try {
				return respond(save_odhcpd_config(request.args.config || {}));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'odhcpd settings save failed: ' + e,
					changed: false,
					section: (collect_uci_config('dhcp', ['odhcpd']) || [])[0] || null,
					sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
				});
			}
		}
	},

	network_routes_save: {
		args: {
			rows: [],
			allow_empty: false
		},
		call: function(request) {
			try {
				return respond(save_network_routes(request.args.rows || [], request.args.allow_empty));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'Static routes save failed: ' + e,
					changed: false,
					routes: network_route_rows(),
					sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
				});
			}
		}
	},

	network_rules_save: {
		args: {
			rows: [],
			allow_empty: false
		},
		call: function(request) {
			try {
				return respond(save_network_rules(request.args.rows || [], request.args.allow_empty));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'Policy rules save failed: ' + e,
					changed: false,
					rules: network_rule_rows(),
					sections: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6'])
				});
			}
		}
	},

	firewall_defaults_save: {
		args: {
			config: {}
		},
		call: function(request) {
			try {
				return respond(save_firewall_defaults(request.args.config || {}));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'Firewall defaults save failed: ' + e,
					changed: false,
					section: (collect_uci_config('firewall', ['defaults']) || [])[0] || null,
					sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
				});
			}
		}
	},

	firewall_zones_save: {
		args: {
			rows: []
		},
		call: function(request) {
			try {
				return respond(save_firewall_zones(request.args.rows || []));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'Firewall zones save failed: ' + e,
					changed: false,
					zones: firewall_zone_rows(),
					sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
				});
			}
		}
	},

	firewall_forwardings_save: {
		args: {
			rows: []
		},
		call: function(request) {
			try {
				return respond(save_firewall_forwardings(request.args.rows || []));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'Firewall forwardings save failed: ' + e,
					changed: false,
					forwardings: firewall_forwarding_rows(),
					sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
				});
			}
		}
	},

	firewall_rules_save: {
		args: {
			rows: []
		},
		call: function(request) {
			try {
				return respond(save_firewall_rules(request.args.rows || []));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'Firewall rules save failed: ' + e,
					changed: false,
					rules: firewall_rule_rows(),
					sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
				});
			}
		}
	},

	firewall_includes_save: {
		args: {
			rows: []
		},
		call: function(request) {
			try {
				return respond(save_firewall_includes(request.args.rows || []));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'Firewall includes save failed: ' + e,
					changed: false,
					includes: firewall_include_rows(),
					sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
				});
			}
		}
	},

	firewall_ipsets_save: {
		args: {
			rows: [],
			allow_empty: false
		},
		call: function(request) {
			try {
				return respond(save_firewall_ipsets(request.args.rows || [], request.args.allow_empty));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'Firewall IP sets save failed: ' + e,
					changed: false,
					ipsets: firewall_ipset_rows(),
					sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
				});
			}
		}
	},

	system_settings_save: {
		args: {
			config: {}
		},
		call: function(request) {
			try {
				return respond(save_system_settings(request.args.config || {}));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'System settings save failed: ' + e,
					changed: false,
					sections: collect_system_settings_sections()
				});
			}
		}
	},

	system_time_sync: {
		args: {
			action: '',
			localtime: 0
		},
		call: function(request) {
			return respond(sync_system_time(request.args.action, request.args.localtime));
		}
	},

	luci_ui_settings_save: {
		args: {
			config: {}
		},
		call: function(request) {
			try {
				return respond(save_luci_ui_settings(request.args.config || {}));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'LuCI UI settings save failed: ' + e,
					changed: false,
					sections: collect_system_settings_sections()
				});
			}
		}
	},

	native_page: {
		args: {
			page: ''
		},
		call: function(request) {
			return respond(native_page(request.args.page || 'status-routes'));
		}
	},

	package_search: {
		args: {
			query: ''
		},
		call: function(request) {
			return respond(package_search(request.args.query || ''));
		}
	},

	package_detail: {
		args: {
			name: ''
		},
		call: function(request) {
			try {
				return respond(package_detail(request.args.name || ''));
			}
			catch (e) {
				return respond({
					ok: false,
					manager: command_exists('apk') ? 'apk' : 'opkg',
					name: request.args.name || '',
					installed: false,
					version: '',
					description: '',
					webpage: '',
					installedSize: '',
					license: '',
					dependencies: [],
					provides: [],
					requiredBy: [],
					files: [],
					warnings: [],
					message: 'Package detail failed: ' + e
				});
			}
		}
	},

	package_i18n_suggestions: {
		args: {
			name: ''
		},
		call: function(request) {
			try {
				return respond(package_i18n_suggestions(request.args.name || ''));
			}
			catch (e) {
				return respond({
					ok: false,
					manager: command_exists('apk') ? 'apk' : 'opkg',
					name: request.args.name || '',
					language: '',
					prefix: '',
					lines: [],
					warnings: [],
					message: 'Translation suggestions failed: ' + e
				});
			}
		}
	},

	package_action: {
		args: {
			action: '',
			name: '',
			simulate: true,
			options: {}
		},
		call: function(request) {
			try {
				return respond(package_action(request.args.action || '', request.args.name || '', request.args.simulate, request.args.options || {}));
			}
			catch (e) {
				return respond({
					ok: false,
					manager: command_exists('apk') ? 'apk' : 'opkg',
					action: request.args.action || '',
					name: request.args.name || '',
					simulate: !!request.args.simulate,
					command: '',
					output: '',
					message: 'Package action failed: ' + e
				});
			}
		}
	},

	package_job_start: {
		args: {
			action: '',
			name: '',
			options: {}
		},
		call: function(request) {
			try {
				return respond(package_job_start(request.args.action || '', request.args.name || '', request.args.options || {}));
			}
			catch (e) {
				return respond({
					started: false,
					job: null,
					result: {
						ok: false,
						manager: command_exists('apk') ? 'apk' : 'opkg',
						action: request.args.action || '',
						name: request.args.name || '',
						simulate: false,
						command: '',
						output: '',
						message: 'Package job start failed: ' + e
					}
				});
			}
		}
	},

	package_job_status: {
		args: {
			id: ''
		},
		call: function(request) {
			return respond(package_job_status(request.args.id || ''));
		}
	},

	package_file_stage: {
		args: {
			filename: '',
			data: ''
		},
		call: function(request) {
			try {
				return respond(package_file_stage(request.args.filename || '', request.args.data || ''));
			}
			catch (e) {
				return respond({
					ok: false,
					message: 'Package file staging failed: ' + e,
					filename: package_safe_filename(request.args.filename || 'package.apk'),
					path: '',
					size: 0,
					checksum: '',
					sha256sum: ''
				});
			}
		}
	},

	package_feeds_save: {
		args: {
			rows: []
		},
		call: function(request) {
			try {
				return respond(save_package_feeds(request.args.rows || []));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'Package feed configuration save failed: ' + e,
					changed: false,
					feeds: package_feed_rows()
				});
			}
		}
	},

	attendedsysupgrade_config_save: {
		args: {
			config: {}
		},
		call: function(request) {
			try {
				return respond(save_attendedsysupgrade_config(request.args.config || {}));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'Attended sysupgrade settings save failed: ' + e,
					changed: false,
					sections: attendedsysupgrade_sections()
				});
			}
		}
	},

	attendedsysupgrade_plan: {
		args: {
			action: ''
		},
		call: function(request) {
			try {
				return respond(attendedsysupgrade_plan(request.args.action || 'check'));
			}
			catch (e) {
				return respond({
					ok: false,
					helper: command_exists('owut') ? 'owut' : (command_exists('auc') ? 'auc' : 'none'),
					action: request.args.action || 'check',
					command: '',
					output: '',
					lines: [],
					warnings: [],
					message: 'Attended sysupgrade planning failed: ' + e
				});
			}
		}
	},

	attendedsysupgrade_job_start: {
		args: {
			action: ''
		},
		call: function(request) {
			try {
				return respond(attendedsysupgrade_job_start(request.args.action || 'check'));
			}
			catch (e) {
				return respond({
					started: false,
					job: null,
					result: {
						ok: false,
						helper: command_exists('owut') ? 'owut' : (command_exists('auc') ? 'auc' : 'none'),
						action: request.args.action || 'check',
						command: '',
						output: '',
						lines: [],
						warnings: [],
						message: 'Attended sysupgrade job start failed: ' + e
					}
				});
			}
		}
	},

	attendedsysupgrade_job_status: {
		args: {
			id: ''
		},
		call: function(request) {
			return respond(attendedsysupgrade_job_status(request.args.id || ''));
		}
	},

	service_detail: {
		args: {
			id: ''
		},
		call: function(request) {
			return respond(service_detail(request.args.id || ''));
		}
	},

	service_action: {
		args: {
			id: '',
			action: 'status'
		},
		call: function(request) {
			return respond(service_action(request.args.id || '', request.args.action || 'status'));
		}
	},

	custom_command_run: {
		args: {
			id: '',
			args: ''
		},
		call: function(request) {
			return respond(run_custom_command(request.args.id || '', request.args.args || ''));
		}
	},

	startup_action: {
		args: {
			name: '',
			action: 'status'
		},
		call: function(request) {
			return respond(run_init_action(request.args.name || '', request.args.action || 'status'));
		}
	},

	crontab_save: {
		args: {
			text: ''
		},
		call: function(request) {
			return respond(save_crontab(request.args.text || ''));
		}
	},

	ssh_keys_save: {
		args: {
			text: ''
		},
		call: function(request) {
			return respond(save_ssh_keys(request.args.text || ''));
		}
	},

	rc_local_save: {
		args: {
			text: ''
		},
		call: function(request) {
			return respond(save_rc_local(request.args.text || ''));
		}
	},

	dropbear_config_save: {
		args: {
			config: {}
		},
		call: function(request) {
			try {
				return respond(save_dropbear_config(request.args.config || {}));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'SSH access save failed: ' + e,
					changed: false,
					section: null,
					sections: collect_uci_config('dropbear', ['dropbear']),
					init: fast_service_state('dropbear')
				});
			}
		}
	},

	led_config_save: {
		args: {
			rows: [],
			allow_empty: false
		},
		call: function(request) {
			try {
				return respond(save_led_config(request.args.rows || [], request.args.allow_empty));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'LED configuration save failed: ' + e,
					changed: false,
					sections: collect_uci_config('system', ['led'])
				});
			}
		}
	},

	uhttpd_config_save: {
		args: {
			config: {}
		},
		call: function(request) {
			return respond(save_uhttpd_config(request.args.config || {}));
		}
	},

	uhttpd_certificate_file_save: {
		args: {
			kind: 'cert',
			filename: '',
			text: '',
			encoding: 'text'
		},
		call: function(request) {
			try {
				return respond(save_uhttpd_certificate_file(request.args.kind || 'cert', request.args.filename || '', request.args.text || '', request.args.encoding || 'text'));
			}
			catch (e) {
				return respond(uhttpd_cert_result(false, 'Certificate file save failed: ' + e, false, null));
			}
		}
	},

	uhttpd_certificate_remove: {
		args: {
			action: 'remove_files',
			confirm: ''
		},
		call: function(request) {
			try {
				return respond(remove_uhttpd_certificate_files(request.args.action || 'remove_files', request.args.confirm || ''));
			}
			catch (e) {
				return respond(uhttpd_cert_result(false, 'Certificate removal failed: ' + e, false, null));
			}
		}
	},

	adblock_fast_config_save: {
		args: {
			config: {},
			feeds: []
		},
		call: function(request) {
			try {
				return respond(save_adblock_fast_config(request.args.config || {}, request.args.feeds || []));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'AdBlock Fast settings save failed: ' + e,
					changed: false,
					...adblock_fast_save_state()
				});
			}
		}
	},

	banip_config_save: {
		args: {
			config: {}
		},
		call: function(request) {
			try {
				return respond(save_banip_config(request.args.config || {}));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'banIP settings save failed: ' + e,
					changed: false,
					...banip_save_state()
				});
			}
		}
	},

	banip_file_save: {
		args: {
			path: '',
			text: ''
		},
		call: function(request) {
			try {
				return respond(save_banip_file(request.args.path || '', request.args.text || ''));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'banIP file save failed: ' + e,
					changed: false,
					file: null
				});
			}
		}
	},

	upnpd_config_save: {
		args: {
			config: {},
			rules: []
		},
		call: function(request) {
			try {
				return respond(save_upnpd_config(request.args.config || {}, request.args.rules || []));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'UPnP settings save failed: ' + e,
					changed: false,
					config: (collect_uci_config('upnpd', ['upnpd']) || [])[0] || null,
					rules: upnpd_rule_rows(),
					sections: collect_uci_config('upnpd', ['upnpd', 'perm_rule'])
				});
			}
		}
	},

	upnpd_active_rule_delete: {
		args: {
			token: ''
		},
		call: function(request) {
			return respond(upnpd_delete_active_rule(request.args.token || ''));
		}
	},

	uhttpd_cert_defaults_save: {
		args: {
			config: {}
		},
		call: function(request) {
			try {
				return respond(save_uhttpd_cert_defaults(request.args.config || {}));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'Certificate defaults save failed: ' + e,
					changed: false,
					sections: collect_system_settings_sections()
				});
			}
		}
	},

	password_set: {
		args: {
			username: 'root',
			password: '',
			confirm: ''
		},
		call: function(request) {
			return respond(set_router_password(request.args.username || 'root', request.args.password || '', request.args.confirm || ''));
		}
	},

	reboot_confirm: {
		args: {
			confirm: ''
		},
		call: function(request) {
			return respond(reboot_confirm(request.args.confirm || ''));
		}
	},

	config_backup_create: {
		args: {
			dry_run: false
		},
		call: function(request) {
			return respond(create_config_backup(!!request.args.dry_run));
		}
	},

	sysupgrade_config_save: {
		args: {
			text: ''
		},
		call: function(request) {
			return respond(save_sysupgrade_config(request.args.text || ''));
		}
	},

	restore_backup_validate: {
		args: {
			filename: '',
			data: ''
		},
		call: function(request) {
			return respond(restore_backup_validate(request.args.filename || '', request.args.data || ''));
		}
	},

	restore_backup_apply: {
		args: {
			confirm: ''
		},
		call: function(request) {
			return respond(restore_backup_apply(request.args.confirm || ''));
		}
	},

	firstboot_apply: {
		args: {
			confirm: ''
		},
		call: function(request) {
			return respond(firstboot_apply(request.args.confirm || ''));
		}
	},

	mtdblock_download: {
		args: {
			id: ''
		},
		call: function(request) {
			return respond(mtdblock_download(request.args.id || ''));
		}
	},

	firmware_validate: {
		args: {
			filename: '',
			data: ''
		},
		call: function(request) {
			return respond(firmware_validate(request.args.filename || '', request.args.data || ''));
		}
	},

	firmware_flash: {
		args: {
			options: {}
		},
		call: function(request) {
			return respond(firmware_flash(request.args.options || {}));
		}
	},

	firewall_redirects_save: {
		args: {
			rows: []
		},
		call: function(request) {
			try {
				return respond(save_firewall_redirects(request.args.rows || []));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'Firewall redirects save failed: ' + e,
					changed: false,
					redirects: firewall_redirect_rows(),
					sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
				});
			}
		}
	},

	firewall_nats_save: {
		args: {
			rows: []
		},
		call: function(request) {
			try {
				return respond(save_firewall_nats(request.args.rows || []));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'Firewall NAT rules save failed: ' + e,
					changed: false,
					nats: firewall_nat_rows(),
					sections: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'nat', 'ipset', 'include'])
				});
			}
		}
	},

	firewall_file_save: {
		args: {
			path: '',
			text: ''
		},
		call: function(request) {
			try {
				return respond(save_firewall_file(request.args.path || '', request.args.text || ''));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'Firewall file save failed: ' + e,
					changed: false,
					file: null
				});
			}
		}
	},

	custom_commands_save: {
		args: {
			rows: []
		},
		call: function(request) {
			try {
				return respond(save_custom_commands(request.args.rows || []));
			}
			catch (e) {
				return respond({
					saved: false,
					message: 'Custom commands save failed: ' + e,
					changed: false,
					commands: custom_command_entries(),
					sections: collect_uci_config('luci', ['command'])
				});
			}
		}
	},

	diagnostics_run: {
		args: {
			tool: '',
			target: ''
		},
		call: function(request) {
			let target = replace(request.args.target || '', /[^A-Za-z0-9_.:-]/g, '');
			let tool = request.args.tool || 'ping';
			let command = null;

			if (!length(target))
				return respond({ output: 'Target is required.' });

			if (tool == 'ping')
				command = `ping -c 4 ${target}`;
			else if (tool == 'traceroute')
				command = `traceroute ${target}`;
			else if (tool == 'nslookup')
				command = `nslookup ${target}`;

			return respond({
				output: command ? shell_output(command) : 'Unsupported diagnostic tool.'
			});
		}
	},

	changes_list: {
		call: function() {
			return respond({
				changes: uci_change_rows()
			});
		}
	},

	changes_apply: {
		call: function() {
			return respond({
				applied: false,
				message: 'Apply bridge is not available yet.'
			});
		}
	},

	changes_revert: {
		call: function() {
			let count = revert_uci_changes();
			return respond({
				reverted: true,
				count
			});
		}
	},

	console_status: {
		call: function() {
			let helper = console_helper_call(['status'], null);

			if (helper?.available == true) {
				return respond({
					available: true,
					enabled: true,
					transport: 'tunnel',
					tunnelAvailable: true,
					requiresDirectConnectivity: false,
					maxSessions: helper.maxSessions || 4,
					idleTimeout: helper.idleTimeout || 600
				});
			}

			uci.load('ttyd');

			let section = null;

			uci.foreach('ttyd', 'ttyd', function(s) {
				section ??= s;
			});

			const port = section?.port || '7681';
			const ssl = section?.ssl == '1';
			const enabled = section?.enable != '0' && port != '0' && section?.command != null;

			return respond({
				available: section != null,
				enabled,
				transport: 'direct',
				tunnelAvailable: false,
				requiresDirectConnectivity: true,
				port,
				ssl,
				path: '/',
				url: `${ssl ? 'https' : 'http'}://{{host}}:${port}/`
			});
		}
	},

	console_launch: {
		call: function() {
			let helper = console_helper_call(['launch'], null);

			if (helper?.available == true && helper?.sessionId) {
				helper.transport = 'tunnel';
				helper.tunnelAvailable = true;
				helper.requiresDirectConnectivity = false;
				helper.enabled = true;
				return respond(helper);
			}

			uci.load('ttyd');

			let section = null;

			uci.foreach('ttyd', 'ttyd', function(s) {
				section ??= s;
			});

			const port = section?.port || '7681';
			const ssl = section?.ssl == '1';
			const enabled = section?.enable != '0' && port != '0' && section?.command != null;
			let credential = section?.credential || '';
			let rotated = false;

			if (section != null && enabled) {
				let username = split(credential, ':')?.[0] || 'iloveluci';
				let password = trim(shell_output(`dd if=/dev/urandom bs=16 count=1 2>/dev/null | hexdump -ve '1/1 "%02x"'`));

				if (length(password) >= 32) {
					credential = username + ':' + password;
					uci.set('ttyd', section['.name'], 'credential', credential);
					uci.commit('ttyd');
					system('/etc/init.d/ttyd restart >/dev/null 2>&1 || true');
					rotated = true;
				}
			}

			const parts = split(credential, ':');
			const username = parts?.[0] || '';
			const password = parts?.[1] || '';

			return respond({
				available: section != null,
				enabled,
				transport: 'direct',
				tunnelAvailable: false,
				requiresDirectConnectivity: true,
				port,
				ssl,
				username,
				password,
				rotated,
				path: '/',
				url: `${ssl ? 'https' : 'http'}://{{host}}:${port}/`
			});
		}
	},

	console_poll: {
		args: {
			session_id: '',
			sequence: 0
		},
		call: function(request) {
			let result = console_helper_call(['poll', request.args.session_id || '', '' + (request.args.sequence || 0)], null);

			return respond(result || {
				available: false,
				active: false,
				output: '',
				sequence: 0,
				message: 'Console tunnel helper is not installed.'
			});
		}
	},

	console_write: {
		args: {
			session_id: '',
			input: ''
		},
		call: function(request) {
			let result = console_helper_call(['write', request.args.session_id || '', hex_encode_text(request.args.input || '')], null);

			return respond(result || {
				available: false,
				accepted: false,
				message: 'Console tunnel helper is not installed.'
			});
		}
	},

	console_resize: {
		args: {
			session_id: '',
			columns: 80,
			rows: 24
		},
		call: function(request) {
			let result = console_helper_call([
				'resize',
				request.args.session_id || '',
				'' + (request.args.columns || 80),
				'' + (request.args.rows || 24)
			], null);

			return respond(result || {
				available: false,
				accepted: false,
				message: 'Console tunnel helper is not installed.'
			});
		}
	},

	console_close: {
		args: {
			session_id: ''
		},
		call: function(request) {
			let result = console_helper_call(['close', request.args.session_id || ''], null);

			return respond(result || {
				available: false,
				accepted: false,
				message: 'Console tunnel helper is not installed.'
			});
		}
	},

	auth_mfa_status: {
		call: function() {
			return respond({
				enabled: false,
				required: false,
				methods: []
			});
		}
	},

	auth_mfa_begin_setup: {
		call: function() {
			return respond({
				available: false,
				message: 'MFA setup is not available yet.'
			});
		}
	},

	auth_mfa_verify_setup: {
		call: function() {
			return respond({
				verified: false
			});
		}
	},

	auth_mfa_verify_login: {
		call: function() {
			return respond({
				verified: false
			});
		}
	}
};

return { 'luci.iloveluci': methods };
