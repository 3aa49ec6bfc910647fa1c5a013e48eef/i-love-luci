#
# Copyright (C) 2020 Jo-Philipp Wich <jo@mein.io>
#
# This is free software, licensed under the Apache License, Version 2.0 .
#

include $(TOPDIR)/rules.mk

PKG_VERSION:=1.0.0
PKG_RELEASE:=1

LUCI_TITLE:=I Love LuCI modern accessible theme
LUCI_DEPENDS:=+luci-base

PKG_LICENSE:=Apache-2.0

define Package/luci-theme-i-love-luci/postrm
#!/bin/sh
[ "$${PKG_UPGRADE}" = 1 ] || [ -n "$${IPKG_INSTROOT}" ] || {
	uci -q delete luci.themes.ILoveLuCI
	uci -q delete luci.iloveluci
	uci commit luci
}
endef

include ../../luci.mk

# call BuildPackage - OpenWrt buildroot signature
