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
	'/admin/status/realtime/wireless': { status: 'partial', nativePath: '/native/wireless' },
	'/admin/status/channel_analysis': { status: 'partial', nativePath: '/native/wireless' },
	'/admin/network': { status: 'partial', nativePath: '/core/network' },
	'/admin/network/network': { status: 'partial', nativePath: '/core/network' },
	'/admin/network/routes': { status: 'partial', nativePath: '/core/network' },
	'/admin/network/wireless': { status: 'partial', nativePath: '/native/wireless' },
	'/admin/network/diagnostics': { status: 'supported', nativePath: '/native/diagnostics' },
	'/admin/network/dhcp': { status: 'partial', nativePath: '/core/dhcp' },
	'/admin/network/dns': { status: 'partial', nativePath: '/core/dhcp' },
	'/admin/network/firewall': { status: 'partial', nativePath: '/core/firewall' },
	'/admin/network/firewall/zones': { status: 'partial', nativePath: '/core/firewall' },
	'/admin/network/firewall/forwards': { status: 'partial', nativePath: '/core/firewall' },
	'/admin/network/firewall/rules': { status: 'partial', nativePath: '/core/firewall' },
	'/admin/network/firewall/snats': { status: 'partial', nativePath: '/core/firewall' },
	'/admin/network/firewall/ipsets': { status: 'partial', nativePath: '/core/firewall' },
	'/admin/network/firewall/custom': { status: 'partial', nativePath: '/core/firewall' },
	'/admin/system': { status: 'partial', nativePath: '/core/system' },
	'/admin/system/system': { status: 'partial', nativePath: '/core/system' },
	'/admin/system/admin': { status: 'supported', nativePath: '/native/password' },
	'/admin/system/admin/password': { status: 'supported', nativePath: '/native/password' },
	'/admin/system/admin/dropbear': { status: 'partial', nativePath: '/native/service/dropbear' },
	'/admin/system/admin/sshkeys': { status: 'supported', nativePath: '/native/sshkeys' },
	'/admin/system/admin/uhttpd': { status: 'supported', nativePath: '/native/service/uhttpd' },
	'/admin/system/admin/repokeys': { status: 'supported', nativePath: '/native/repokeys' },
	'/admin/system/attendedsysupgrade': { status: 'partial', nativePath: '/native/attendedsysupgrade', autoMode: 'legacy' },
	'/admin/system/attendedsysupgrade/overview': { status: 'partial', nativePath: '/native/attendedsysupgrade', autoMode: 'legacy' },
	'/admin/system/attendedsysupgrade/configuration': { status: 'partial', nativePath: '/native/attendedsysupgrade', autoMode: 'legacy' },
	'/admin/system/package-manager': { status: 'partial', nativePath: '/native/packages', autoMode: 'legacy' },
	'/admin/system/startup': { status: 'supported', nativePath: '/native/startup' },
	'/admin/system/crontab': { status: 'supported', nativePath: '/native/crontab' },
	'/admin/system/flash': { status: 'partial', nativePath: '/native/flash' },
	'/admin/system/commands': { status: 'partial', nativePath: '/native/service/commands', autoMode: 'legacy' },
	'/admin/system/commands/dashboard': { status: 'partial', nativePath: '/native/service/commands', autoMode: 'legacy' },
	'/admin/system/commands/config': { status: 'partial', nativePath: '/native/service/commands', autoMode: 'legacy' },
	'/admin/system/i-love-luci-theme': { status: 'supported', nativePath: '/settings' },
	'/admin/system/reboot': { status: 'supported', nativePath: '/native/reboot' },
	'/admin/system/leds': { status: 'partial', nativePath: '/native/leds' },
	'/admin/services': { status: 'supported', nativePath: '/native/services' },
	'/admin/services/banip': { status: 'partial', nativePath: '/native/service/banip', autoMode: 'legacy' },
	'/admin/services/banip/overview': { status: 'partial', nativePath: '/native/service/banip', autoMode: 'legacy' },
	'/admin/services/banip/allowlist': { status: 'partial', nativePath: '/native/service/banip/allowlist', autoMode: 'legacy' },
	'/admin/services/banip/blocklist': { status: 'partial', nativePath: '/native/service/banip/blocklist', autoMode: 'legacy' },
	'/admin/services/banip/feeds': { status: 'partial', nativePath: '/native/service/banip/feeds', autoMode: 'legacy' },
	'/admin/services/banip/setreport': { status: 'partial', nativePath: '/native/service/banip/setreport', autoMode: 'legacy' },
	'/admin/services/banip/firewall_log': { status: 'partial', nativePath: '/native/service/banip/firewall_log', autoMode: 'legacy' },
	'/admin/services/banip/processing_log': { status: 'partial', nativePath: '/native/service/banip/processing_log', autoMode: 'legacy' },
	'/admin/services/adblock-fast': { status: 'partial', nativePath: '/native/service/adblock-fast', autoMode: 'legacy' },
	'/admin/services/upnp': { status: 'partial', nativePath: '/native/service/upnpd', autoMode: 'legacy' },
	'/admin/services/uhttpd': { status: 'partial', nativePath: '/native/service/uhttpd', autoMode: 'legacy' }
};
const servicePackages = {
	'adblock-fast': {
		package: 'adblock-fast',
		init: 'adblock-fast',
		title: 'AdBlock Fast',
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
		sections: ['banip'],
		logPattern: 'banip',
		files: [
			{ title: 'Allowlist', path: '/etc/banip/banip.allowlist' },
			{ title: 'Blocklist', path: '/etc/banip/banip.blocklist' },
			{ title: 'Custom feeds', path: '/etc/banip/banip.custom.feeds' },
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
	let has_native = nativeStatus == 'supported' || nativeStatus == 'partial';

	if (configuredMode == 'hidden')
		return 'hidden';

	if (configuredMode == 'legacy')
		return 'legacy';

	if (configuredMode == 'modern')
		return has_native ? 'modern' : 'legacy';

	if (autoMode == 'legacy')
		return 'legacy';

	return has_native ? 'modern' : 'legacy';
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
			mac: type(section.mac) == 'array' ? join(', ', section.mac) : (section.mac || '')
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

function save_dhcp_static_hosts(rows) {
	rows ||= [];
	uci.load('dhcp');

	let changed = false;
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

		if (!valid_ipv4(ip))
			return {
				saved: false,
				message: 'Static DHCP host IP must be an IPv4 address.',
				changed: false,
				hosts: dhcp_static_hosts(),
				sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
			};

		if (!valid_mac_list(mac) || !length(mac_list))
			return {
				saved: false,
				message: 'Static DHCP host MAC address is required.',
				changed: false,
				hosts: dhcp_static_hosts(),
				sections: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd'])
			};

		let current_name = uci.get('dhcp', section, 'name') || '';
		let current_ip = uci.get('dhcp', section, 'ip') || '';
		let current_mac = uci.get('dhcp', section, 'mac') || [];

		if (current_name != name) {
			changed = true;
			dhcp_set_option(section, 'name', name);
		}

		if (current_ip != ip) {
			changed = true;
			uci.set('dhcp', section, 'ip', ip);
		}

		if (!same_dhcp_list(current_mac, mac_list)) {
			changed = true;
			uci.set('dhcp', section, 'mac', length(mac_list) == 1 ? mac_list[0] : mac_list);
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

function dhcp_zero_one(value) {
	return value == '1' || value == 1 || value == true || value == 'on' ? '1' : '0';
}

function dhcp_numeric_value(value) {
	return value == '' || replace(value, /[^0-9]/g, '') == value;
}

function valid_dhcp_leasetime(value) {
	return length(value) && replace(value, /[^A-Za-z0-9_-]/g, '') == value;
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

function package_upgrades() {
	if (command_exists('apk'))
		return shell_output('apk version -l "<" 2>&1 | sed -n "1,160p"');

	return shell_output('opkg list-upgradable 2>&1 | sed -n "1,160p"');
}

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
		let quoted = quote_command_args([path])[0];

		if (info?.type == 'file') {
			line_count = int(trim(shell_output(`wc -l < ${quoted}`)) || 0);
			preview = split(trim(shell_output(`sed -n '1,20p' ${quoted}`)), '\n');
		}

		if (length(preview) == 1 && !length(preview[0]))
			preview = [];

		push(entries, {
			title: file.title || path,
			path,
			exists: info?.type == 'file',
			size: info?.size || 0,
			lines: line_count,
			preview
		});
	}

	return entries;
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

	return {
		id,
		title: meta.title,
		package: meta.package,
		init: fast_service_state(meta.init),
		sections: collect_uci_config(meta.package, meta.sections || []),
		customCommands: id == 'commands' ? custom_command_entries() : [],
		files: service_files(meta),
		logs: service_logs(meta)
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

function save_dropbear_config(config) {
	config ||= {};

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
		Interface: trim('' + (config.Interface || ''))
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

function collect_system_settings_sections() {
	let system = collect_uci_config('system', ['system', 'timeserver', 'led', 'button']);

	for (let section in collect_uci_config('dropbear', ['dropbear']))
		push(system, section);

	for (let section in collect_uci_config('uhttpd', ['uhttpd', 'cert', 'cert_defaults']))
		push(system, section);

	return system;
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
		log_size: clean_uci_value(config.log_size || ''),
		log_proto: config.log_proto == 'tcp' ? 'tcp' : 'udp',
		conloglevel: clean_uci_value(config.conloglevel || ''),
		cronloglevel: clean_uci_value(config.cronloglevel || '')
	};

	if (!valid_numeric_value(next_system.log_size) || !valid_numeric_value(next_system.conloglevel) || !valid_numeric_value(next_system.cronloglevel))
		return {
			saved: false,
			message: 'Log size and log levels must be numeric.',
			changed: false,
			sections: collect_system_settings_sections()
		};

	let ntp_section = first_uci_section('system', 'timeserver');
	let next_ntp = {
		enabled: zero_one(config.ntp_enabled),
		use_dhcp: zero_one(config.ntp_use_dhcp),
		server: split_uci_lines(config.ntp_servers || '')
	};

	let changed = false;

	for (let key, value in next_system) {
		let current = uci.get('system', system_section, key) || '';

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
	let current_ntp_use_dhcp = uci.get('system', ntp_section, 'use_dhcp') || '1';
	let current_ntp_servers = uci.get('system', ntp_section, 'server') || [];

	if (current_ntp_enabled != next_ntp.enabled) {
		changed = true;
		if (next_ntp.enabled == '1')
			uci.delete('system', ntp_section, 'enabled');
		else
			uci.set('system', ntp_section, 'enabled', '0');
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

function save_led_config(rows) {
	rows ||= [];
	uci.load('system');

	let changed = false;
	let keep = {};
	let existing = {};

	uci.foreach('system', 'led', function(section) {
		existing[section['.name']] = true;
	});

	for (let row in rows) {
		let section = clean_uci_value(row?.section || '');
		let is_existing = length(section) && uci.get('system', section) == 'led';

		if (!is_existing) {
			section = uci.add('system', 'led');
			changed = true;
		}

		keep[section] = true;

		let next = {
			name: clean_uci_value(row?.name || section),
			sysfs: clean_uci_value(row?.sysfs || ''),
			trigger: clean_uci_value(row?.trigger || 'none'),
			dev: clean_uci_value(row?.dev || ''),
			mode: clean_uci_value(row?.mode || ''),
			interval: clean_uci_value(row?.interval || '')
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

			if (current != value) {
				changed = true;
				set_uci_option('system', section, key, value);
			}
		}
	}

	for (let section in existing) {
		if (!keep[section]) {
			uci.delete('system', section);
			changed = true;
		}
	}

	if (changed) {
		uci.commit('system');
		system('/etc/init.d/led reload >/dev/null 2>&1 || /etc/init.d/led restart >/dev/null 2>&1');
	}

	return {
		saved: true,
		message: changed ? 'LED configuration saved and reloaded.' : 'LED configuration already up to date.',
		changed,
		sections: collect_uci_config('system', ['led'])
	};
}

function save_uhttpd_config(config) {
	config ||= {};
	uci.load('uhttpd');

	let section = first_uci_section('uhttpd', 'uhttpd') || 'main';
	let redirect_https = zero_one(config.redirect_https);
	let current = uci.get('uhttpd', section, 'redirect_https') || '0';
	let changed = current != redirect_https;

	if (changed) {
		uci.set('uhttpd', section, 'redirect_https', redirect_https);
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
		data.sections = collect_uci_config('attendedsysupgrade', ['server']);
		data.commands = [
			{ title: 'Current firmware', output: shell_output('cat /etc/openwrt_release') },
			{ title: 'Upgrade helper', output: command_exists('auc') ? shell_output('auc --help 2>&1 | head -n 80') : 'auc is not installed.' }
		];
	}
	else if (page == 'packages') {
		data.lines = package_list();
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
			}
		];
	}
	else if (page == 'flash') {
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
		dhcpStatus: {},
		firewall: [],
		system: []
	};

	if (page == 'dhcp') {
		data.dhcp = collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'odhcpd']);
		data.dhcpLeases = dhcp_leases();
		data.dhcpHosts = dhcp_static_hosts();
		data.dhcpDomains = dhcp_domain_records();
		data.dhcpPools = dhcp_pool_rows();
		data.dhcpStatus = dhcp_status();
	}
	else if (page == 'firewall') {
		data.firewall = collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'ipset', 'include']);
	}
	else if (page == 'system') {
		data.system = collect_system_settings_sections();
	}
	else {
		data.network = collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6']);
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
		let nativeStatus = nativeRoute?.status || 'unsupported';
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
			nativeAutoMode: nativeRoute?.autoMode || 'modern',
			configuredMode,
			effectiveMode: mode,
			nativePath: nativeRoute?.nativePath || null,
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
			return respond(save_dropbear_config(request.args.config || {}));
		}
	},

	led_config_save: {
		args: {
			rows: []
		},
		call: function(request) {
			return respond(save_led_config(request.args.rows || []));
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
			uci.load('ttyd');

			let section = null;

			uci.foreach('ttyd', 'ttyd', function(s) {
				section ??= s;
			});

			const port = section?.port || '7681';
			const ssl = section?.ssl == '1';
			const credential = section?.credential || '';
			const parts = split(credential, ':');
			const username = parts?.[0] || '';
			const password = parts?.[1] || '';
			const enabled = section?.enable != '0' && port != '0' && section?.command != null;

			return respond({
				available: section != null,
				enabled,
				port,
				ssl,
				username,
				password,
				path: '/',
				url: `${ssl ? 'https' : 'http'}://{{host}}:${port}/`
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
