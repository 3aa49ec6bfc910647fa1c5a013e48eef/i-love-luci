'use strict';
'require baseclass';
'require ui';
'require uci';

return baseclass.extend({
	__init__() {
		this.searchIndex = [];
		this.initGlobalLoadingOverlay();
		L.resolveDefault(uci.load('luci')).then(() => {
			this.migrateLocalPreferences();
			this.applyPreferences();
			ui.menu.load().then((tree) => this.render(tree));
		});
	},

	render(tree) {
		let node = tree;
		let url = '';

		this.renderModeMenu(node);

		if (L.env.dispatchpath.length >= 3) {
			for (var i = 0; i < 3 && node; i++) {
				node = node.children[L.env.dispatchpath[i]];
				url = url + (url ? '/' : '') + L.env.dispatchpath[i];
			}

			if (node)
				this.renderTabMenu(node, url);
		}

		this.searchIndex = this.buildSearchIndex(tree);
		this.renderHeaderSearch();
		this.renderProfileMenu();
		this.trackRecentPage();
		this.initSimplifiedSave();
		this.updatePendingChanges().then(() => this.maybeShowPendingToast());

		document.querySelector('#menubar > .navigation')
			.addEventListener('click', ui.createHandlerFn(this, 'handleSidebarToggle'));

		if (!this.globalKeydownHandler) {
			this.globalKeydownHandler = L.bind(this.handleGlobalKeydown, this);
			window.addEventListener('keydown', this.globalKeydownHandler, true);
		}

		if (!this.sidebarOutsideClickHandler) {
			this.sidebarOutsideClickHandler = L.bind(this.handleSidebarOutsideClick, this);
			document.addEventListener('click', this.sidebarOutsideClickHandler);
		}

		if (!this.pendingChangeHandler) {
			this.pendingChangeHandler = L.bind(this.updatePendingChanges, this);
			document.addEventListener('uci-loaded', this.pendingChangeHandler);
			document.addEventListener('uci-applied', this.pendingChangeHandler);
			document.addEventListener('uci-reverted', this.pendingChangeHandler);
		}
	},

	initGlobalLoadingOverlay() {
		if (this.loadingOverlay)
			return;

		this.loadingOverlay = document.querySelector('.iloveluci-loading-overlay');

		if (!this.loadingOverlay) {
			this.loadingOverlay = E('div', {
				'class': 'iloveluci-loading-overlay',
				'aria-hidden': 'true'
			}, [
				E('div', { 'class': 'iloveluci-loading-indicator' }, [
					E('span'),
					E('span'),
					E('span')
				])
			]);

			document.body.appendChild(this.loadingOverlay);
		}

		this.updateGlobalLoadingOverlay();

		if (!this.loadingClickHandler) {
			this.loadingClickHandler = (ev) => this.handleGlobalLoadingClick(ev);
			this.loadingSubmitHandler = (ev) => this.handleGlobalLoadingSubmit(ev);

			document.addEventListener('click', this.loadingClickHandler, true);
			document.addEventListener('submit', this.loadingSubmitHandler, true);
			window.addEventListener('pageshow', () => this.hideGlobalLoadingOverlay());
			window.addEventListener('load', () => this.hideGlobalLoadingOverlay());
			window.addEventListener('beforeunload', () => this.showGlobalLoadingOverlay());
		}

		const view = document.querySelector('#view');

		if (view && !this.loadingViewObserver) {
			this.loadingViewObserver = new MutationObserver(() => this.updateGlobalLoadingOverlay());
			this.loadingViewObserver.observe(view, { childList: true });
		}
	},

	handleGlobalLoadingClick(ev) {
		const link = ev.target.closest('a[href]');

		if (!link || ev.defaultPrevented || ev.button != 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey)
			return;

		if (link.hasAttribute('download') || (link.target && link.target != '_self'))
			return;

		let url;

		try {
			url = new URL(link.href, window.location.href);
		}
		catch (e) {
			return;
		}

		if (url.origin != window.location.origin)
			return;

		if (url.pathname == window.location.pathname && url.search == window.location.search && url.hash)
			return;

		this.showGlobalLoadingOverlay();
	},

	handleGlobalLoadingSubmit(ev) {
		const form = ev.target.closest('form');

		if (form)
			this.showGlobalLoadingOverlay();
	},

	isViewLoading() {
		const view = document.querySelector('#view');
		const first = view ? view.firstElementChild : null;

		return !!(first && first.classList && first.classList.contains('spinning'));
	},

	updateGlobalLoadingOverlay() {
		if (this.isViewLoading())
			this.showGlobalLoadingOverlay();
		else
			this.hideGlobalLoadingOverlay();
	},

	showGlobalLoadingOverlay() {
		if (!this.loadingOverlay)
			return;

		window.clearTimeout(this.loadingHideTimer);
		window.clearTimeout(this.loadingFallbackTimer);
		document.body.classList.add('iloveluci-loading-active');
		this.loadingOverlay.setAttribute('aria-hidden', 'false');

		this.loadingFallbackTimer = window.setTimeout(() => {
			this.hideGlobalLoadingOverlay();
		}, 8000);
	},

	hideGlobalLoadingOverlay() {
		if (!this.loadingOverlay)
			return;

		window.clearTimeout(this.loadingFallbackTimer);
		document.body.classList.remove('iloveluci-loading-active');
		this.loadingOverlay.setAttribute('aria-hidden', 'true');
	},

	handleMenuExpand(ev) {
		const a = ev.target.closest('a');

		if (!a)
			return;

		const href = a.getAttribute('href');

		if (href) {
			a.blur();
			return;
		}

		const ul1 = a.parentNode.parentNode;
		const ul2 = a.nextElementSibling;

		document.querySelectorAll('ul.mainmenu.l1 > li.active').forEach(li => {
			if (li !== a.parentNode)
				li.classList.remove('active');
		});

		if (!ul2)
			return;

		if (ul2.parentNode.offsetLeft + ul2.offsetWidth <= ul1.offsetLeft + ul1.offsetWidth)
			ul2.classList.add('align-left');

		ul1.classList.add('active');
		a.parentNode.classList.add('active');
		a.blur();

		if (!a.getAttribute('href')) {
			ev.preventDefault();
			ev.stopPropagation();
		}
	},

	getFirstChildPath(node, path) {
		const children = ui.menu.getChildren(node).filter(child => child.name != 'logout');

		if (!children.length)
			return path;

		return this.getFirstChildPath(children[0], path + '/' + children[0].name);
	},

	renderMainMenu(tree, url, level) {
		const l = (level || 0) + 1;
		const ul = E('ul', { 'class': 'mainmenu l%d'.format(l) });
		const children = ui.menu.getChildren(tree);

		if (children.length == 0 || l > 2)
			return E([]);

		children.forEach(child => {
			if (child.name == 'logout')
				return;

			const isActive = (L.env.dispatchpath[l] == child.name);
			const hasChildren = ui.menu.getChildren(child).length > 0;
			const isActiveRoute = isActive && (l > 1 || !hasChildren);
			const hrefPath = hasChildren
				? this.getFirstChildPath(child, url + '/' + child.name)
				: url + '/' + child.name;
			const activeClass = 'mainmenu-item-%s%s%s'.format(
				child.name,
				isActive ? ' selected' : '',
				isActiveRoute ? ' active-route' : ''
			);

			ul.appendChild(E('li', { 'class': activeClass }, [
				E('a', {
					'href': L.url.apply(L, hrefPath.split('/')),
					'aria-current': isActiveRoute ? 'page' : null,
					'click': (l == 1) ? (ev) => this.handleMenuExpand(ev) : ''
				}, [
					_(child.title)
				]),
				this.renderMainMenu(child, url + '/' + child.name, l)
			]));
		});

		if (l == 1)
			document.querySelector('#mainmenu').appendChild(E('div', [ ul ]));

		return ul;
	},

	buildSearchIndex(tree) {
		const items = [];

		const walk = (node, parts, labels) => {
			ui.menu.getChildren(node).forEach(child => {
				const childParts = parts.concat([ child.name ]);
				const childLabels = labels.concat([ _(child.title || child.name) ]);

				if (childParts.length > 1 && childParts.join('/') != 'admin/system/i-love-luci-theme') {
					items.push({
						title: childLabels[childLabels.length - 1],
						path: childLabels.join(' / '),
						url: childParts,
						query: childLabels.join(' ').toLowerCase()
					});
				}

				walk(child, childParts, childLabels);
			});
		};

		walk(tree, [], []);

		return items;
	},

	renderSidebarTools() {
		const bar = document.querySelector('#mainmenu');

		if (!bar || bar.querySelector('.iloveluci-sidebar-footer'))
			return;

		const footer = E('div', { 'class': 'iloveluci-sidebar-footer' }, [
			E('a', {
				'class': 'iloveluci-tool-button',
				'href': L.url('admin', 'system', 'i-love-luci-theme')
			}, [ _('Theme settings') ])
		]);

		bar.appendChild(footer);
	},

	renderHeaderSearch() {
		const host = document.querySelector('#menubar .hostname');
		const indicators = document.querySelector('#indicators');

		if (!host || host.querySelector('.iloveluci-header-search'))
			return;

		host.classList.add('iloveluci-header-search-host');
		host.textContent = '';
		host.appendChild(E('div', { 'class': 'iloveluci-header-search-wrap' }, [
			E('form', {
				'class': 'iloveluci-header-search',
				'submit': (ev) => this.handleHeaderSearchSubmit(ev)
			}, [
				E('span', {
					'class': 'iloveluci-header-search-icon',
					'aria-hidden': 'true'
				}),
				E('input', {
					'id': 'iloveluci-header-search',
					'class': 'iloveluci-header-search-input',
					'type': 'search',
					'placeholder': _('Search'),
					'autocomplete': 'off',
					'keydown': (ev) => this.handleHeaderSearchKeydown(ev)
				})
			]),
			E('div', {
				'class': 'iloveluci-header-search-popover',
				'hidden': 'hidden',
				'role': 'dialog',
				'aria-label': _('Search results')
			}, [
				E('div', { 'class': 'iloveluci-header-search-recent' }, [
					E('div', { 'class': 'iloveluci-command-group-title' }, [ _('Recent') ]),
					E('div', { 'class': 'iloveluci-header-search-recent-list' })
				]),
				E('div', {
					'class': 'iloveluci-header-search-results',
					'role': 'listbox',
					'aria-label': _('Search results')
				})
			])
		]));

		if (indicators && !indicators.querySelector('.iloveluci-pending-badge')) {
			indicators.insertBefore(E('button', {
				'type': 'button',
				'class': 'iloveluci-pending-badge',
				'hidden': 'hidden',
				'click': ui.createHandlerFn(this, 'showPendingChangesDialog')
			}, [ _('pending') ]), indicators.firstChild);
		}

		if (!this.headerSearchCloseHandler) {
			this.headerSearchCloseHandler = (ev) => {
				if (!ev.target.closest('.iloveluci-header-search-wrap'))
					this.closeHeaderSearchPopover();
			};

			document.addEventListener('click', this.headerSearchCloseHandler);
		}

		const input = host.querySelector('#iloveluci-header-search');
		const badge = document.querySelector('.iloveluci-pending-badge');

		if (input) {
			input.addEventListener('focus', (ev) => this.handleHeaderSearchInput(ev));
			input.addEventListener('input', (ev) => this.handleHeaderSearchInput(ev));
		}

		if (badge && !badge.dataset.iloveluciBound) {
			badge.dataset.iloveluciBound = '1';
			badge.addEventListener('click', (ev) => this.showPendingChangesDialog(ev));
		}
	},

	getProfileUserName() {
		const bodyUser = document.body ? document.body.getAttribute('data-auth-user') : '';
		const envUser = L.env ? (L.env.username || L.env.user || L.env.authuser || '') : '';

		return (bodyUser || envUser || 'root').trim();
	},

	getProfileInitials(username) {
		const parts = (username || '')
			.split(/[\s._@-]+/)
			.filter(part => part);

		if (parts.length > 1)
			return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();

		return ((parts[0] || username || '?').charAt(0) || '?').toUpperCase();
	},

	renderProfileMenu() {
		const indicators = document.querySelector('#indicators');

		if (!indicators || indicators.querySelector('.iloveluci-profile'))
			return;

		const username = this.getProfileUserName();
		const initials = this.getProfileInitials(username);

		indicators.appendChild(E('div', { 'class': 'iloveluci-profile' }, [
			E('button', {
				'type': 'button',
				'class': 'iloveluci-profile-button',
				'title': username,
				'aria-label': _('Profile'),
				'aria-haspopup': 'menu',
				'aria-expanded': 'false',
				'click': (ev) => this.handleProfileToggle(ev)
			}, [ initials ]),
			E('div', {
				'class': 'iloveluci-profile-menu',
				'hidden': 'hidden',
				'role': 'menu'
			}, [
				E('div', { 'class': 'iloveluci-profile-menu-user' }, [ username ]),
				E('a', {
					'class': 'iloveluci-profile-menu-item',
					'href': L.url('admin', 'logout'),
					'role': 'menuitem'
				}, [ _('Log out') ])
			])
		]));

		if (!this.profileCloseHandler) {
			this.profileCloseHandler = (ev) => {
				if (!ev.target.closest('.iloveluci-profile'))
					this.closeProfileMenu();
			};

			document.addEventListener('click', this.profileCloseHandler);
		}
	},

	handleProfileToggle(ev) {
		const profile = ev.currentTarget.closest('.iloveluci-profile');
		const menu = profile ? profile.querySelector('.iloveluci-profile-menu') : null;
		const isOpen = menu && !menu.hasAttribute('hidden');

		ev.preventDefault();
		ev.stopPropagation();

		if (isOpen) {
			this.closeProfileMenu();
			return;
		}

		this.closeHeaderSearchPopover();
		this.openProfileMenu(profile);
	},

	openProfileMenu(profile) {
		const button = profile ? profile.querySelector('.iloveluci-profile-button') : null;
		const menu = profile ? profile.querySelector('.iloveluci-profile-menu') : null;

		if (!button || !menu)
			return;

		button.setAttribute('aria-expanded', 'true');
		menu.removeAttribute('hidden');
		menu.classList.add('active');
	},

	closeProfileMenu() {
		document.querySelectorAll('.iloveluci-profile').forEach(profile => {
			const button = profile.querySelector('.iloveluci-profile-button');
			const menu = profile.querySelector('.iloveluci-profile-menu');

			if (button)
				button.setAttribute('aria-expanded', 'false');

			if (menu) {
				menu.classList.remove('active');
				menu.setAttribute('hidden', 'hidden');
			}
		});
	},

	handleHeaderSearchInput(ev) {
		const input = ev ? ev.currentTarget : document.querySelector('#iloveluci-header-search');
		const query = input ? input.value.trim().toLowerCase() : '';

		this.openHeaderSearchPopover();
		this.renderHeaderSearchPopover(query);
	},

	handleHeaderSearchSubmit(ev) {
		const input = document.querySelector('#iloveluci-header-search');
		const query = input ? input.value.trim().toLowerCase() : '';
		let item = null;

		if (ev)
			ev.preventDefault();

		if (query.length >= 2) {
			item = this.searchIndex.filter(entry => entry.query.indexOf(query) > -1)[0];
		}
		else {
			item = this.getRecentItems()[0];
		}

		if (item)
			window.location.href = L.url.apply(L, item.url);
	},

	handleHeaderSearchKeydown(ev) {
		if (ev.key == 'Escape') {
			this.closeHeaderSearchPopover();
			ev.currentTarget.blur();
		}
	},

	openHeaderSearchPopover() {
		const popover = document.querySelector('.iloveluci-header-search-popover');

		if (!popover)
			return;

		popover.removeAttribute('hidden');
		popover.classList.add('active');
	},

	closeHeaderSearchPopover() {
		const popover = document.querySelector('.iloveluci-header-search-popover');

		if (!popover)
			return;

		popover.classList.remove('active');
		popover.setAttribute('hidden', 'hidden');
	},

	renderHeaderSearchPopover(query) {
		const recent = document.querySelector('.iloveluci-header-search-recent');
		const recentList = document.querySelector('.iloveluci-header-search-recent-list');
		const results = document.querySelector('.iloveluci-header-search-results');
		const isSearching = !!query;
		const recentItems = this.getRecentItems().slice(0, 5);

		if (!recent || !recentList || !results)
			return;

		recentList.textContent = '';
		results.textContent = '';
		recent.style.display = (!isSearching && recentItems.length) ? '' : 'none';

		if (!isSearching) {
			recentItems.forEach((item, index) => {
				recentList.appendChild(this.renderCommandItem(item, index));
			});
		}

		if (!isSearching) {
			results.removeAttribute('data-active');
			return;
		}

		const matches = this.searchIndex
			.filter(item => item.query.indexOf(query) > -1)
			.slice(0, 8);

		results.setAttribute('data-active', matches.length ? 'true' : 'empty');

		if (!matches.length) {
			results.appendChild(E('div', { 'class': 'iloveluci-search-empty' }, [ _('No matches') ]));
			return;
		}

		results.appendChild(E('div', { 'class': 'iloveluci-command-group-title' }, [ _('Results') ]));

		matches.forEach((item, index) => {
			results.appendChild(this.renderCommandItem(item, index));
		});
	},

	focusHeaderSearch(ev) {
		const input = document.querySelector('#iloveluci-header-search');

		if (ev)
			ev.preventDefault();

		if (!input)
			return;

		input.focus();
		this.handleHeaderSearchInput({ currentTarget: input });
	},

	renderCommandDrawer() {
		if (document.querySelector('.iloveluci-command-drawer'))
			return;

		document.body.appendChild(E('div', {
			'class': 'iloveluci-command-drawer',
			'aria-hidden': 'true'
		}, [
			E('button', {
				'type': 'button',
				'class': 'iloveluci-command-backdrop',
				'click': (ev) => this.closeCommandDrawer(ev)
			}),
			E('section', {
				'class': 'iloveluci-command-panel',
				'role': 'dialog',
				'aria-modal': 'true',
				'aria-labelledby': 'iloveluci-command-title'
			}, [
				E('div', { 'class': 'iloveluci-command-head' }, [
					E('h2', { 'id': 'iloveluci-command-title' }, [ _('Search for configuration item') ]),
					E('button', {
						'type': 'button',
						'class': 'iloveluci-command-close',
						'aria-label': _('Close'),
						'click': (ev) => this.closeCommandDrawer(ev)
					}, [ '\u00d7' ])
				]),
				E('form', {
					'class': 'iloveluci-command-search',
					'submit': (ev) => this.handleCommandSearchSubmit(ev)
				}, [
					E('input', {
						'id': 'iloveluci-command-search',
						'type': 'search',
						'placeholder': _('Search LuCI'),
						'autocomplete': 'off',
						'input': (ev) => this.handleCommandSearchSubmit(ev),
						'keydown': (ev) => this.handleSearchKeydown(ev)
					}),
					E('button', {
						'type': 'submit',
						'class': 'cbi-button cbi-button-apply'
					}, [ _('Search') ])
				]),
				E('div', { 'class': 'iloveluci-command-recent' }, [
					E('div', { 'class': 'iloveluci-command-group-title' }, [ _('Recent') ]),
					E('div', { 'class': 'iloveluci-command-recent-list' })
				]),
				E('div', {
					'class': 'iloveluci-command-results',
					'role': 'listbox',
					'aria-label': _('Search results')
				})
			])
		]));
	},

	openCommandDrawer(ev) {
		const drawer = document.querySelector('.iloveluci-command-drawer');
		const input = document.querySelector('#iloveluci-command-search');

		if (ev)
			ev.preventDefault();

		if (!drawer)
			return;

		drawer.classList.add('active');
		drawer.setAttribute('aria-hidden', 'false');
		this.renderRecentItems();

		if (input)
			window.setTimeout(() => input.focus(), 0);
	},

	closeCommandDrawer(ev) {
		const drawer = document.querySelector('.iloveluci-command-drawer');

		if (ev)
			ev.preventDefault();

		if (!drawer)
			return;

		drawer.classList.remove('active');
		drawer.setAttribute('aria-hidden', 'true');
	},

	handleCommandSearchSubmit(ev) {
		const input = document.querySelector('#iloveluci-command-search');
		const results = document.querySelector('.iloveluci-command-results');
		const query = input ? input.value.trim().toLowerCase() : '';

		if (ev)
			ev.preventDefault();

		this.renderSearchResults(results, query);
	},

	renderSearchResults(results, query) {
		if (!results)
			return;

		results.textContent = '';

		if (query.length < 2) {
			results.removeAttribute('data-active');
			this.renderRecentItems();
			return;
		}

		this.renderRecentItems(true);

		const matches = this.searchIndex
			.filter(item => item.query.indexOf(query) > -1)
			.slice(0, 12);

		results.setAttribute('data-active', matches.length ? 'true' : 'empty');

		if (!matches.length) {
			results.appendChild(E('div', { 'class': 'iloveluci-search-empty' }, [ _('No matches') ]));
			return;
		}

		matches.forEach((item, index) => {
			results.appendChild(this.renderCommandItem(item, index));
		});
	},

	renderCommandItem(item, index) {
		return E('a', {
			'href': L.url.apply(L, item.url),
			'role': 'option',
			'tabindex': index == 0 ? '0' : '-1',
			'class': 'iloveluci-command-item'
		}, [
			E('span', { 'class': 'iloveluci-command-item-icon' }, [ '>' ]),
			E('span', { 'class': 'iloveluci-command-item-text' }, [
				E('strong', [ item.title ]),
				E('span', [ item.path ])
			])
		]);
	},

	trackRecentPage() {
		const current = L.env.dispatchpath ? L.env.dispatchpath.join('/') : '';

		if (!current || current == 'admin/system/i-love-luci-theme')
			return;

		let item = this.searchIndex.filter(entry => entry.url.join('/') == current)[0];

		if (!item) {
			item = {
				title: (document.title || current).split('|')[0].trim(),
				path: current.split('/').join(' / '),
				url: L.env.dispatchpath,
				query: current.replace(/\//g, ' ')
			};
		}

		const recent = this.getRecentItems()
			.filter(entry => entry.url.join('/') != item.url.join('/'));

		recent.unshift(item);
		this.setLocalPreference('recent', JSON.stringify(recent.slice(0, 6)));
	},

	getRecentItems() {
		try {
			const stored = window.localStorage.getItem('luci-theme-i-love-luci.recent') ||
				window.localStorage.getItem('luci-theme-openwrt2026.recent') ||
				window.localStorage.getItem('luci-theme-openwrt-2026.recent') ||
				'[]';
			const items = JSON.parse(stored);

			return Array.isArray(items) ? items.filter(item => item && Array.isArray(item.url)) : [];
		}
		catch (e) {
			return [];
		}
	},

	renderRecentItems(hidden) {
		const section = document.querySelector('.iloveluci-command-recent');
		const list = document.querySelector('.iloveluci-command-recent-list');

		if (!section || !list)
			return;

		list.textContent = '';

		if (hidden) {
			section.style.display = 'none';
			return;
		}

		const items = this.getRecentItems();
		section.style.display = items.length ? '' : 'none';

		items.forEach((item, index) => {
			list.appendChild(this.renderCommandItem(item, index));
		});
	},

	handleSearchKeydown(ev) {
		if (ev.key != 'Enter')
			return;

		ev.preventDefault();
		this.handleCommandSearchSubmit(ev);
	},

	handleGlobalKeydown(ev) {
		const key = (ev.key || '').toLowerCase();
		const isSearchShortcut = (key == 'k' || ev.code == 'KeyK') && (ev.metaKey || ev.ctrlKey);
		const isSlashShortcut = ev.key == '/' && !/^(input|select|textarea)$/i.test(ev.target.tagName || '');

		if (isSearchShortcut || isSlashShortcut) {
			this.focusHeaderSearch(ev);
			ev.stopPropagation();
			return;
		}

		if (ev.key == 'Escape') {
			this.closeHeaderSearchPopover();
			this.closeCommandDrawer(ev);
			this.closeSidebar();
			this.closeProfileMenu();
		}
	},

	handleVariantChange(ev) {
		this.setPreference('variant', ev.currentTarget.value || 'ocean');
		this.applyPreferences();
	},

	handleDensityToggle(ev) {
		const next = this.getPreference('density', 'comfortable') == 'compact' ? 'comfortable' : 'compact';

		this.setPreference('density', next);
		this.applyPreferences();

		ev.currentTarget.setAttribute('aria-pressed', next == 'compact' ? 'true' : 'false');
		ev.currentTarget.textContent = next == 'compact' ? _('Comfortable density') : _('Compact density');
	},

	getPreference(name, fallback) {
		const stored = uci.get('luci', 'iloveluci', name);

		if (stored != null)
			return stored;

		const legacyStored = uci.get('luci', 'openwrt2026', name);

		if (legacyStored != null)
			return legacyStored;

		return this.getLocalPreference(name, fallback);
	},

	getLocalPreference(name, fallback) {
		try {
			return window.localStorage.getItem('luci-theme-i-love-luci.%s'.format(name)) ||
				window.localStorage.getItem('luci-theme-openwrt2026.%s'.format(name)) ||
				window.localStorage.getItem('luci-theme-openwrt-2026.%s'.format(name)) ||
				fallback;
		}
		catch (e) {
			return fallback;
		}
	},

	isSimplifiedSaveEnabled() {
		return this.getPreference('simplified_save', '1') != '0';
	},

	setPreference(name, value) {
		if (!uci.get('luci', 'iloveluci'))
			uci.add('luci', 'theme', 'iloveluci');

		uci.set('luci', 'iloveluci', name, value);
		this.setLocalPreference(name, value);

		return uci.save().then(() => uci.apply());
	},

	setLocalPreference(name, value) {
		try {
			window.localStorage.setItem('luci-theme-i-love-luci.%s'.format(name), value);
		}
		catch (e) {}
	},

	migrateLocalPreferences() {
		const names = [ 'variant', 'density', 'font', 'menu_variant', 'simplified_save' ];
		let changed = false;

		names.forEach(name => {
			const stored = uci.get('luci', 'iloveluci', name);
			const legacyStored = uci.get('luci', 'openwrt2026', name);
			const local = this.getLocalPreference(name, null);
			const value = legacyStored != null ? legacyStored : local;

			if (stored != null || value == null)
				return;

			if (!uci.get('luci', 'iloveluci'))
				uci.add('luci', 'theme', 'iloveluci');

			uci.set('luci', 'iloveluci', name, value);
			changed = true;
		});

		if (changed)
			uci.save().then(() => uci.apply()).catch(() => {});
	},

	applyPreferences() {
		const root = document.documentElement;

		root.setAttribute('data-theme-variant', this.getPreference('variant', 'ocean'));
		root.setAttribute('data-theme-density', this.getPreference('density', 'comfortable'));
		root.setAttribute('data-theme-font', this.getPreference('font', 'galano'));
		root.setAttribute('data-theme-menu', this.getPreference('menu_variant', 'side'));
		root.setAttribute('data-theme-simplified-save', this.getPreference('simplified_save', '1'));
	},

	initSimplifiedSave() {
		if (!this.isSimplifiedSaveEnabled())
			return;

		const apply = () => this.applySimplifiedActions();

		window.setTimeout(apply, 0);
		window.setTimeout(apply, 250);

		if (!this.simplifiedSaveObserver) {
			this.simplifiedSaveObserver = new MutationObserver(apply);
			this.simplifiedSaveObserver.observe(document.body, { childList: true, subtree: true });
		}
	},

	applySimplifiedActions() {
		if (!this.isSimplifiedSaveEnabled())
			return;

		document.querySelectorAll('.cbi-page-actions').forEach(actions => {
			if (actions.closest('.iloveluci-login-card') || actions.closest('.iloveluci-settings-page'))
				return;

			if (actions.dataset.iloveluciSimplified == '1')
				return;

			const save = actions.querySelector('.cbi-button-save');
			const reset = actions.querySelector('.cbi-button-reset');
			const apply = actions.querySelector('.cbi-button-apply');

			if (!save && !reset)
				return;

			actions.dataset.iloveluciSimplified = '1';

			actions.querySelectorAll('button, input, .cbi-dropdown, .cbi-button').forEach(node => {
				node.classList.add('iloveluci-original-action');
				node.setAttribute('aria-hidden', 'true');
			});

			actions.appendChild(E('div', { 'class': 'iloveluci-simplified-actions' }, [
				E('button', {
					'type': 'button',
					'class': 'cbi-button cbi-button-reset',
					'click': () => {
						if (reset)
							reset.click();
						else
							window.location.reload();
					}
				}, [ _('Cancel') ]),
				E('button', {
					'type': 'button',
					'class': 'cbi-button cbi-button-save important',
					'click': () => {
						try {
							window.sessionStorage.setItem('iloveluci-show-pending-toast', '1');
						}
						catch (e) {}

						if (save)
							save.click();
						else if (apply)
							apply.click();

						window.setTimeout(() => this.updatePendingChanges().then(() => this.maybeShowPendingToast()), 500);
						window.setTimeout(() => this.updatePendingChanges().then(() => this.maybeShowPendingToast()), 1400);
					}
				}, [ _('Save') ])
			]));
		});
	},

	countChanges(changes) {
		let count = 0;

		for (const config in changes)
			if (changes.hasOwnProperty(config))
				count += changes[config].length;

		return count;
	},

	updatePendingChanges() {
		const badge = document.querySelector('.iloveluci-pending-badge');

		if (!badge || !L.env.sessionid)
			return Promise.resolve();

		return L.resolveDefault(uci.changes(), {}).then(changes => {
			const count = this.countChanges(changes);

			this.pendingChanges = changes;
			badge.textContent = count ? _('%d pending').format(count) : _('pending');

			if (count) {
				badge.removeAttribute('hidden');
				badge.removeAttribute('disabled');
				badge.setAttribute('aria-label', _('Pending configuration changes'));
			}
			else {
				badge.setAttribute('hidden', 'hidden');
				badge.setAttribute('disabled', 'disabled');
				badge.removeAttribute('aria-label');
			}

			if (ui.changes)
				ui.changes.renderChangeIndicator(changes);
		});
	},

	maybeShowPendingToast() {
		let shouldShow = false;

		try {
			shouldShow = window.sessionStorage.getItem('iloveluci-show-pending-toast') == '1';
		}
		catch (e) {}

		const count = this.countChanges(this.pendingChanges || {});

		if (!shouldShow || !count)
			return;

		try {
			window.sessionStorage.removeItem('iloveluci-show-pending-toast');
		}
		catch (e) {}

		this.showPendingToast(count);
	},

	showPendingToast(count) {
		let region = document.querySelector('.iloveluci-toast-region');

		if (!region) {
			region = E('div', {
				'class': 'iloveluci-toast-region',
				'aria-live': 'polite',
				'aria-atomic': 'true'
			});
			document.body.appendChild(region);
		}

		region.textContent = '';
		region.appendChild(E('div', { 'class': 'iloveluci-toast' }, [
			E('div', { 'class': 'iloveluci-toast-content' }, [
				E('strong', [ _('Changes saved') ]),
				E('span', [ _('%d pending changes need applying.').format(count) ])
			]),
			E('button', {
				'type': 'button',
				'class': 'iloveluci-toast-action',
				'click': () => {
					region.textContent = '';
					this.showPendingChangesDialog();
				}
			}, [ _('Review') ])
		]));

		window.clearTimeout(this.pendingToastTimer);
		this.pendingToastTimer = window.setTimeout(() => {
			if (region)
				region.textContent = '';
		}, 2500);
	},

	renderPendingChangeList(changes) {
		const list = E('div', { 'class': 'iloveluci-pending-list' });
		let hasChanges = false;

		for (const config in changes) {
			if (!changes.hasOwnProperty(config) || !changes[config].length)
				continue;

			hasChanges = true;
			list.appendChild(E('h4', [ '/etc/config/%s'.format(config) ]));

			changes[config].forEach(change => {
				list.appendChild(E('code', [ change.join(' ') ]));
			});
		}

		return hasChanges ? list : E('p', { 'class': 'iloveluci-search-empty' }, [ _('There are no pending changes.') ]);
	},

	showPendingChangesDialog(ev) {
		if (ev)
			ev.preventDefault();

		const openDialog = (changes) => {
			const count = this.countChanges(changes);

			if (!count)
				return;

			ui.showModal(_('Apply pending changes?'), [
				E('div', { 'class': 'iloveluci-pending-dialog' }, [
					E('p', [ _('Review the saved configuration changes before applying them.') ]),
					this.renderPendingChangeList(changes),
					E('div', { 'class': 'button-row' }, [
						E('button', {
							'class': 'btn cbi-button',
							'click': ui.hideModal
						}, [ _('Cancel') ]),
						E('button', {
							'class': 'btn cbi-button cbi-button-reset',
							'click': () => ui.changes.revert()
						}, [ _('Revert') ]),
						E('button', {
							'class': 'btn cbi-button cbi-button-apply important',
							'click': () => ui.changes.apply(true)
						}, [ _('Apply') ])
					])
				])
			]).classList.add('iloveluci-command-modal');
		};

		const cached = this.pendingChanges || {};

		if (this.countChanges(cached)) {
			openDialog(cached);
			this.updatePendingChanges();
			return;
		}

		this.updatePendingChanges().then(() => openDialog(this.pendingChanges || {}));
	},

	renderModeMenu(tree) {
		const menu = document.querySelector('#modemenu');
		const children = ui.menu.getChildren(tree);

		children.forEach((child, index) => {
			const isActive = L.env.requestpath.length
				? child.name === L.env.requestpath[0]
				: index === 0;

			if (index > 0)
				menu.appendChild(E([], ['\u00a0|\u00a0']));

			menu.appendChild(E('div', { 'class': isActive ? 'active' : '' }, [
				E('a', { href: L.url(child.name) }, [
					_(child.title)
				])
			]));

			if (isActive)
				this.renderMainMenu(child, child.name);
		});

		if (menu.children.length > 1)
			menu.style.display = '';
	},

	renderTabMenu(tree, url, level) {
		const container = document.querySelector('#tabmenu');
		const l = (level || 0) + 1;
		const ul = E('ul', { 'class': 'cbi-tabmenu' });
		const children = ui.menu.getChildren(tree);
		let activeNode = null;

		if (children.length == 0)
			return E([]);

		children.forEach(child => {
			const isActive = (L.env.dispatchpath[l + 2] == child.name);
			const activeClass = isActive ? ' cbi-tab' : '';
			const className = 'tabmenu-item-%s %s'.format(child.name, activeClass);

			ul.appendChild(E('li', { 'class': className }, [
				E('a', { 'href': L.url(url, child.name) }, [
					_(child.title)
				])
			]));

			if (isActive)
				activeNode = child;
		});

		container.appendChild(ul);
		container.style.display = '';

		if (activeNode)
			container.appendChild(this.renderTabMenu(activeNode, url + '/' + activeNode.name, l));

		return ul;
	},

	handleSidebarToggle(ev) {
		const btn = ev.currentTarget;
		const bar = document.querySelector('#mainmenu');
		const isOpen = !btn.classList.contains('active');

		btn.classList.toggle('active', isOpen);

		if (bar)
			bar.classList.toggle('active', isOpen);

		document.body.classList.toggle('iloveluci-sidebar-open', isOpen);
	},

	handleSidebarOutsideClick(ev) {
		const bar = document.querySelector('#mainmenu');
		const toggle = document.querySelector('#menubar > .navigation');
		const isMobile = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;

		if (!isMobile || !bar || !bar.classList.contains('active'))
			return;

		if (bar.contains(ev.target) || (toggle && toggle.contains(ev.target)))
			return;

		this.closeSidebar();
	},

	closeSidebar() {
		const btn = document.querySelector('#menubar > .navigation');
		const bar = document.querySelector('#mainmenu');

		if (btn)
			btn.classList.remove('active');

		if (bar)
			bar.classList.remove('active');

		document.body.classList.remove('iloveluci-sidebar-open');
	}
});
