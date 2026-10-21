# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/libunwind/test/libunwind/test/config.py
lines:71 exports:
---
#===----------------------------------------------------------------------===##
#
# Part of the LLVM Project, under the Apache License v2.0 with LLVM Exceptions.
# See https://llvm.org/LICENSE.txt for license information.
# SPDX-License-Identifier: Apache-2.0 WITH LLVM-exception
#
#===----------------------------------------------------------------------===##
import os
import sys

from libcxx.test.config import Configuration as LibcxxConfiguration


class Configuration(LibcxxConfiguration):
    # pylint: disable=redefined-outer-name
    def __init__(self, lit_config, config):
        super(Configuration, self).__init__(lit_config, config)
        self.libunwind_src_root = None
        self.libunwind_obj_root = None
        self.abi_library_root = None
        self.libcxx_src_root = None

    def configure_src_root(self):
        self.libunwind_src_root = (self.get_lit_conf('libunwind_src_root')
            or os.path.dirname(self.config.test_source_root))
        self.libcxx_src_root = (self.get_lit_conf('libcxx_src_root')
            or os.path.join(self.libunwind_src_root, '..', 'libcxx'))

    def configure_obj_root(self):
        self.libunwind_obj_root = self.get_lit_conf('libunwind_obj_root')
        super(Configuration, self).configure_obj_root()

    def has_cpp_feature(self, feature, required_value):
        return int(self.cxx.dumpMacros().get('__cpp_' + feature, 0)) >= required_value

    def configure_features(self):
        super(Configuration, self).configure_features()
        if self.get_lit_bool('arm_ehabi', False):
            self.config.available_features.add('libunwind-arm-ehabi')

