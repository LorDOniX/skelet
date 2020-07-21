MAIN_JS_FILES =	$(addsuffix .js, $(addprefix es6/, $(shell cat js_transpiled_files.txt)))
NAME = imageuploader
NAME_LEGACY = imageuploader-legacy
BUILD_DIR = ../../
TRANSPILE_PATH = $(BUILD_DIR).build/$(NAME)/
VPATH = $(TRANSPILE_PATH)

BABEL_BIN := $(BUILD_DIR)../node_modules/.bin/babel
UGLIFY_BIN := $(BUILD_DIR)../node_modules/.bin/uglifyjs

$(BUILD_DIR)$(NAME).js: $(MAIN_JS_FILES)
	cat $(MAIN_JS_FILES) > $@;
	@echo write file $@;

$(BUILD_DIR)$(NAME)-c.js: $(BUILD_DIR)$(NAME).js
	cat $^ | $(UGLIFY_BIN) > $@

$(BUILD_DIR)$(NAME_LEGACY)-c.js: legacy
	cat $(BUILD_DIR)$(NAME_LEGACY).js | $(UGLIFY_BIN) > $@

compress: build-dir legacy
	@${MAKE} $(BUILD_DIR)$(NAME)-c.js
	@${MAKE} $(BUILD_DIR)$(NAME_LEGACY)-c.js

$(BUILD_DIR)$(NAME_LEGACY).js: $(BUILD_DIR)$(NAME).js
	@echo transpile ES6 file $^
	@$(BABEL_BIN) $^ | sed '/^"use strict";$$/ d' > $@

legacy: $(BUILD_DIR)$(NAME_LEGACY).js

compile: build-dir
	@${MAKE} $(BUILD_DIR)$(NAME).js

clean:
	rm -f $(BUILD_DIR)$(NAME).js $(BUILD_DIR)$(NAME)-c.js $(BUILD_DIR)$(NAME_LEGACY).js $(BUILD_DIR)$(NAME_LEGACY)-c.js
	rm -rf $(TRANSPILE_PATH)

build-dir:
	mkdir -p $(TRANSPILE_PATH)

.PHONY:	compile compress clean build-dir legacy
