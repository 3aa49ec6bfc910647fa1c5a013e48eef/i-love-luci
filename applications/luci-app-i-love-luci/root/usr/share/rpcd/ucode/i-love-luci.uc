#!/usr/bin/env ucode

'use strict';

import { cursor } from 'uci';

const uci = cursor();

function respond(data) {
	return {
		ok: true,
		data
	};
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
			return respond({
				items: [
					{ title: 'Status', path: '/admin/status/overview', legacy: true },
					{ title: 'Network', path: '/admin/network/network', legacy: true },
					{ title: 'DHCP and DNS', path: '/admin/network/dhcp', legacy: true },
					{ title: 'I Love LuCI', path: '/admin/i-love-luci', legacy: false }
				]
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
				message: 'Apply bridge is not implemented in the spike yet.'
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
				message: 'MFA setup is documented but not implemented in this spike build.'
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
