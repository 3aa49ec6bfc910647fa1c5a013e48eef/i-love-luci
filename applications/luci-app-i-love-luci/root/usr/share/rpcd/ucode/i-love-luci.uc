#!/usr/bin/env ucode

'use strict';

import { cursor } from 'uci';
import { connect } from 'ubus';
import { glob, open, popen, readfile, stat } from 'fs';

const uci = cursor();
const ubus = connect();
const menuRoot = '/usr/share/luci/menu.d/*.json';
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
	'/admin/status/realtime': { status: 'partial', nativePath: '/' },
	'/admin/status/realtime/load': { status: 'supported', nativePath: '/' },
	'/admin/status/realtime/bandwidth': { status: 'supported', nativePath: '/' },
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
	'/admin/system/admin': { status: 'partial', nativePath: '/core/system' },
	'/admin/system/admin/password': { status: 'partial', nativePath: '/core/system' },
	'/admin/system/admin/dropbear': { status: 'partial', nativePath: '/native/service/dropbear' },
	'/admin/system/admin/sshkeys': { status: 'partial', nativePath: '/core/system' },
	'/admin/system/admin/uhttpd': { status: 'partial', nativePath: '/native/service/uhttpd' },
	'/admin/system/admin/repokeys': { status: 'partial', nativePath: '/core/system' },
	'/admin/system/attendedsysupgrade': { status: 'partial', nativePath: '/native/attendedsysupgrade' },
	'/admin/system/attendedsysupgrade/overview': { status: 'partial', nativePath: '/native/attendedsysupgrade' },
	'/admin/system/attendedsysupgrade/configuration': { status: 'partial', nativePath: '/native/attendedsysupgrade' },
	'/admin/system/package-manager': { status: 'supported', nativePath: '/native/packages' },
	'/admin/system/startup': { status: 'supported', nativePath: '/native/startup' },
	'/admin/system/crontab': { status: 'supported', nativePath: '/native/crontab' },
	'/admin/system/flash': { status: 'partial', nativePath: '/native/flash' },
	'/admin/system/commands': { status: 'partial', nativePath: '/native/service/commands' },
	'/admin/system/commands/dashboard': { status: 'partial', nativePath: '/native/service/commands' },
	'/admin/system/commands/config': { status: 'partial', nativePath: '/native/service/commands' },
	'/admin/system/i-love-luci-theme': { status: 'supported', nativePath: '/settings' },
	'/admin/system/reboot': { status: 'supported', nativePath: '/native/reboot' },
	'/admin/system/leds': { status: 'partial', nativePath: '/core/system' },
	'/admin/services': { status: 'partial', nativePath: '/native/services' },
	'/admin/services/banip': { status: 'partial', nativePath: '/native/service/banip' },
	'/admin/services/banip/overview': { status: 'partial', nativePath: '/native/service/banip' },
	'/admin/services/banip/allowlist': { status: 'partial', nativePath: '/native/service/banip' },
	'/admin/services/banip/blocklist': { status: 'partial', nativePath: '/native/service/banip' },
	'/admin/services/banip/feeds': { status: 'partial', nativePath: '/native/service/banip' },
	'/admin/services/banip/setreport': { status: 'partial', nativePath: '/native/service/banip' },
	'/admin/services/banip/firewall_log': { status: 'partial', nativePath: '/native/service/banip' },
	'/admin/services/banip/processing_log': { status: 'partial', nativePath: '/native/service/banip' },
	'/admin/services/adblock-fast': { status: 'partial', nativePath: '/native/service/adblock-fast' },
	'/admin/services/upnp': { status: 'partial', nativePath: '/native/service/upnpd' },
	'/admin/services/uhttpd': { status: 'partial', nativePath: '/native/service/uhttpd' }
};
const servicePackages = {
	'adblock-fast': { package: 'adblock-fast', init: 'adblock-fast', title: 'AdBlock Fast', sections: ['adblock-fast', 'file_url'] },
	banip: { package: 'banip', init: 'banip', title: 'banIP', sections: ['banip'] },
	commands: { package: 'luci-commands', init: null, title: 'Custom Commands', sections: ['command'] },
	dropbear: { package: 'dropbear', init: 'dropbear', title: 'Dropbear SSH', sections: ['dropbear'] },
	uhttpd: { package: 'uhttpd', init: 'uhttpd', title: 'uHTTPd', sections: ['uhttpd', 'cert', 'cert_defaults'] },
	upnpd: { package: 'upnpd', init: 'miniupnpd', title: 'UPnP IGD & PCP', sections: ['upnpd', 'perm_rule'] }
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

function effective_mode(configuredMode, nativeStatus) {
	let has_native = nativeStatus == 'supported' || nativeStatus == 'partial';

	if (configuredMode == 'hidden')
		return 'hidden';

	if (configuredMode == 'legacy')
		return 'legacy';

	if (configuredMode == 'modern')
		return has_native ? 'modern' : 'legacy';

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
	let service_list = ubus.call('service', 'list', { name }) || {};

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

	return {
		name,
		enabled,
		running
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

function package_list() {
	let output = command_exists('apk')
		? shell_output('apk info -vv | sort | head -n 300')
		: shell_output('opkg list-installed | sort | head -n 300');

	return split(trim(output), '\n');
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
			logs: {}
		};

	return {
		id,
		title: meta.title,
		package: meta.package,
		init: fast_service_state(meta.init),
		sections: collect_uci_config(meta.package, meta.sections || []),
		logs: {}
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
	}
	else if (page == 'startup') {
		data.services = startup_entries();
	}
	else if (page == 'crontab') {
		data.text = safe_read('/etc/crontabs/root');
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
	let system = collect_uci_config('system', ['system', 'timeserver', 'led', 'button']);

	for (let section in collect_uci_config('dropbear', ['dropbear']))
		push(system, section);

	for (let section in collect_uci_config('uhttpd', ['uhttpd', 'cert', 'cert_defaults']))
		push(system, section);

	return {
		page,
		network: collect_uci_config('network', ['globals', 'device', 'interface', 'route', 'route6', 'rule', 'rule6']),
		dhcp: collect_uci_config('dhcp', ['dnsmasq', 'dhcp', 'host', 'domain', 'odhcpd']),
		firewall: collect_uci_config('firewall', ['defaults', 'zone', 'forwarding', 'rule', 'redirect', 'ipset', 'include']),
		system
	};
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
		let mode = effective_mode(configuredMode, nativeStatus);
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

	native_page: {
		args: {
			page: ''
		},
		call: function(request) {
			return respond(native_page(request.args.page || 'status-routes'));
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

	startup_action: {
		args: {
			name: '',
			action: 'status'
		},
		call: function(request) {
			return respond(run_init_action(request.args.name || '', request.args.action || 'status'));
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
				changes: []
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
			uci.unload();
			return respond({
				reverted: true
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
