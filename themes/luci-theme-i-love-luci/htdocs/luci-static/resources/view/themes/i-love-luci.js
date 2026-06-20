'use strict';
'require view';
'require ui';
'require uci';

function getPreference(name, fallback) {
	const stored = uci.get('luci', 'iloveluci', name);

	if (stored != null)
		return stored;

	const legacyStored = uci.get('luci', 'openwrt2026', name);

	if (legacyStored != null)
		return legacyStored;

	try {
		return window.localStorage.getItem('luci-theme-i-love-luci.%s'.format(name)) ||
			window.localStorage.getItem('luci-theme-openwrt2026.%s'.format(name)) ||
			window.localStorage.getItem('luci-theme-openwrt-2026.%s'.format(name)) ||
			fallback;
	}
	catch (e) {
		return fallback;
	}
}

function setPreference(name, value) {
	if (!uci.get('luci', 'iloveluci'))
		uci.add('luci', 'theme', 'iloveluci');

	uci.set('luci', 'iloveluci', name, value);

	try {
		window.localStorage.setItem('luci-theme-i-love-luci.%s'.format(name), value);
	}
	catch (e) {}

	return uci.save().then(() => uci.apply());
}

function setPreferences(values) {
	if (!uci.get('luci', 'iloveluci'))
		uci.add('luci', 'theme', 'iloveluci');

	for (const name in values) {
		uci.set('luci', 'iloveluci', name, values[name]);

		try {
			window.localStorage.setItem('luci-theme-i-love-luci.%s'.format(name), values[name]);
		}
		catch (e) {}
	}

	return uci.save().then(() => uci.apply());
}

function applyPreferences() {
	const root = document.documentElement;

	root.setAttribute('data-theme-variant', getPreference('variant', 'ocean'));
	root.setAttribute('data-theme-density', getPreference('density', 'comfortable'));
	root.setAttribute('data-theme-font', getPreference('font', 'galano'));
	root.setAttribute('data-theme-menu', getPreference('menu_variant', 'side'));
	root.setAttribute('data-theme-simplified-save', getPreference('simplified_save', '1'));
}

return view.extend({
	load() {
		return L.resolveDefault(uci.load('luci'));
	},

	render() {
		const variant = getPreference('variant', 'ocean');
		const density = getPreference('density', 'comfortable');
		const font = getPreference('font', 'galano');
		const menuVariant = getPreference('menu_variant', 'side');
		const simplifiedSave = getPreference('simplified_save', '1');

		return E('div', { 'class': 'cbi-map iloveluci-settings-page' }, [
			E('h2', [ _('I Love LuCI Theme') ]),
			E('div', { 'class': 'cbi-section' }, [
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title', 'for': 'iloveluci-theme-variant' }, [ _('Style') ]),
					E('div', { 'class': 'cbi-value-field' }, [
						E('select', {
							'id': 'iloveluci-theme-variant',
							'change': function(ev) {
								setPreference('variant', ev.currentTarget.value || 'ocean');
								applyPreferences();
							}
						}, [
							E('option', { value: 'ocean', selected: variant == 'ocean' ? 'selected' : null }, [ _('Ocean') ]),
							E('option', { value: 'forest', selected: variant == 'forest' ? 'selected' : null }, [ _('Forest') ]),
							E('option', { value: 'ember', selected: variant == 'ember' ? 'selected' : null }, [ _('Ember') ]),
							E('option', { value: 'contrast', selected: variant == 'contrast' ? 'selected' : null }, [ _('Contrast') ])
						])
					])
				]),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title', 'for': 'iloveluci-theme-density' }, [ _('Density') ]),
					E('div', { 'class': 'cbi-value-field' }, [
						E('select', {
							'id': 'iloveluci-theme-density',
							'change': function(ev) {
								setPreference('density', ev.currentTarget.value || 'comfortable');
								applyPreferences();
							}
						}, [
							E('option', { value: 'comfortable', selected: density == 'comfortable' ? 'selected' : null }, [ _('Comfortable') ]),
							E('option', { value: 'compact', selected: density == 'compact' ? 'selected' : null }, [ _('Compact') ])
						])
					])
				]),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title', 'for': 'iloveluci-theme-menu-variant' }, [ _('Menu bar (desktop only)') ]),
					E('div', { 'class': 'cbi-value-field' }, [
						E('select', {
							'id': 'iloveluci-theme-menu-variant',
							'change': function(ev) {
								setPreference('menu_variant', ev.currentTarget.value || 'side');
								applyPreferences();
							}
						}, [
							E('option', { value: 'side', selected: menuVariant == 'side' ? 'selected' : null }, [ _('Side') ]),
							E('option', { value: 'top', selected: menuVariant == 'top' ? 'selected' : null }, [ _('Top') ])
						])
					])
				]),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title', 'for': 'iloveluci-theme-font' }, [ _('Font') ]),
					E('div', { 'class': 'cbi-value-field' }, [
						E('select', {
							'id': 'iloveluci-theme-font',
							'change': function(ev) {
								setPreference('font', ev.currentTarget.value || 'galano');
								applyPreferences();
							}
						}, [
							E('option', { value: 'galano', selected: font == 'galano' ? 'selected' : null }, [ _('Galano') ]),
							E('option', { value: 'system', selected: font == 'system' ? 'selected' : null }, [ _('System') ]),
							E('option', { value: 'humanist', selected: font == 'humanist' ? 'selected' : null }, [ _('Humanist') ]),
							E('option', { value: 'serif', selected: font == 'serif' ? 'selected' : null }, [ _('Serif') ]),
							E('option', { value: 'mono', selected: font == 'mono' ? 'selected' : null }, [ _('Mono') ])
						])
					])
				]),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title', 'for': 'iloveluci-theme-simplified-save' }, [ _('Simplified save') ]),
					E('div', { 'class': 'cbi-value-field' }, [
						E('select', {
							'id': 'iloveluci-theme-simplified-save',
							'change': function(ev) {
								setPreference('simplified_save', ev.currentTarget.value || '1');
								applyPreferences();
							}
						}, [
							E('option', { value: '1', selected: simplifiedSave != '0' ? 'selected' : null }, [ _('On') ]),
							E('option', { value: '0', selected: simplifiedSave == '0' ? 'selected' : null }, [ _('Off') ])
						])
					])
				]),
				E('div', { 'class': 'cbi-page-actions' }, [
					E('button', {
						'type': 'button',
						'class': 'cbi-button cbi-button-remove',
						'click': ui.createHandlerFn(this, function() {
							setPreferences({
								variant: 'ocean',
								density: 'comfortable',
								menu_variant: 'side',
								simplified_save: '1',
								font: 'galano'
							}).then(() => {
								applyPreferences();
								window.location.reload();
							});
						})
					}, [ _('Reset') ])
				])
			])
		]);
	}
});
