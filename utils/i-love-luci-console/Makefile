include $(TOPDIR)/rules.mk

PKG_NAME:=i-love-luci-console
PKG_VERSION:=1.0.0
PKG_RELEASE:=5

PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=3aa49ec6bfc910647fa1c5a013e48eef

include $(INCLUDE_DIR)/package.mk

define Package/i-love-luci-console
	SECTION:=utils
	CATEGORY:=Utilities
	TITLE:=I Love LuCI same-origin console helper
	URL:=https://github.com/3aa49ec6bfc910647fa1c5a013e48eef/i-love-luci
endef

define Package/i-love-luci-console/description
	Small root-only PTY session helper for I Love LuCI console tunnelling.
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)
	$(CP) ./src/i-love-luci-console.c $(PKG_BUILD_DIR)/
endef

define Build/Compile
	$(TARGET_CC) $(TARGET_CFLAGS) $(TARGET_CPPFLAGS) -Wall -Wextra -Werror \
		-o $(PKG_BUILD_DIR)/i-love-luci-console \
		$(PKG_BUILD_DIR)/i-love-luci-console.c \
		$(TARGET_LDFLAGS)
endef

define Package/i-love-luci-console/install
	$(INSTALL_DIR) $(1)/usr/sbin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/i-love-luci-console $(1)/usr/sbin/i-love-luci-console
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/i-love-luci-console.init $(1)/etc/init.d/i-love-luci-console
endef

$(eval $(call BuildPackage,i-love-luci-console))
