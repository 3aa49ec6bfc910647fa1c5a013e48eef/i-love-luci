#!/usr/bin/env ucode

'use strict';

import { cursor } from 'uci';
import { connect } from 'ubus';
import { glob, open, stat } from 'fs';

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
	'/admin/network': { status: 'partial', nativePath: '/core/network' },
	'/admin/network/network': { status: 'partial', nativePath: '/core/network' },
	'/admin/network/routes': { status: 'partial', nativePath: '/core/network' },
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
	'/admin/system/admin/dropbear': { status: 'partial', nativePath: '/core/system' },
	'/admin/system/admin/sshkeys': { status: 'partial', nativePath: '/core/system' },
	'/admin/system/admin/uhttpd': { status: 'partial', nativePath: '/core/system' },
	'/admin/system/admin/repokeys': { status: 'partial', nativePath: '/core/system' },
	'/admin/system/leds': { status: 'partial', nativePath: '/core/system' }
};
const routeModes = {
	auto: true,
	modern: true,
	legacy: true,
	hidden: true
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

	for (let section_type in section_types) {
		uci.foreach(package_name, section_type, function(section) {
			push(sections, clone_section(section));
		});
	}

	return sections;
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
