# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/breakpad/docs/mac_breakpad_starter_guide.md
lines:184 exports:
---
# How To Add Breakpad To Your Mac Client Application

This document is a step-by-step recipe to get your Mac client app to build with
Breakpad.

## Preparing a binary build of Breakpad for use in your tree

You can either check in a binary build of the Breakpad framework & tools or
build it as a dependency of your project. The former is recommended, and
detailed here, since building dependencies through other projects is
problematic(matching up configuration names), and the Breakpad code doesn't
change nearly often enough as your application's will.

## Building the requisite targets

All directories are relative to the `src` directory of the Breakpad checkout.

*   Build the 'All' target of `client/mac/Breakpad.xcodeproj` in Release mode.
*   Execute `cp -R client/mac/build/Release/Breakpad.framework <location in your
    source tree>`
*   Inside `tools/mac/dump_syms` directory, build dump\_syms.xcodeproj, and copy
    tools/mac/dump\_syms/build/Release/dump\_syms to a safe location where it
    can be run during the build process.

## Adding Breakpad.framework

Inside your application's framework, add the Breakpad.Framework to your
project's framework settings. When you select it from the file chooser, it will
let you pick a target to add it to; go ahead and check the one that's relevant
to your application.

## Copy Breakpad into your Application Package

Copy Breakpad into your Application Package, so it will be around at run time.

Go to the Targets section of your Xcode Project window. Hit the disclosure
triangle to reveal the build phases of your application. Add a new Copy Files
phase using the Contextual menu (Control Click). On the General panel of the new
'Get Info' of this new phase, set the destination to 'Frameworks' Close the
'Info' panel. Use the Contextual Menu to Rename your new phase 'Copy Frameworks'
