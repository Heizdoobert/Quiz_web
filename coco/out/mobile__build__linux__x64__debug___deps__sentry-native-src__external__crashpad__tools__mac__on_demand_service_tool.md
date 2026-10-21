# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/tools/mac/on_demand_service_tool.md
lines:133 exports:
---
<!--
Copyright 2014 The Crashpad Authors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

# on_demand_service_tool(1)

## Name

on_demand_service_tool—Load and unload on-demand Mach services registered with
launchd(8)

## Synopsis

**on_demand_service_tool** **-L** **-l** _LABEL_ [_OPTION…_] _COMMAND_
[_ARG…_]<br/>
**on_demand_service_tool** **-U** **-l** _LABEL_

## Description

On-demand services may be registered with launchd(8) by using the **--load**
form. One or more service names may be registered with the bootstrap server by
specifying **--mach-service**. When a Mach message is sent to any of these
services, launchd(8) will invoke _COMMAND_ along with any arguments specified
(_ARG…_). _COMMAND_ must be an absolute pathname.

The **--unload** form unregisters jobs registered with launchd(8).

## Options
