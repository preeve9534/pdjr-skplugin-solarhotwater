# pdjr-skplugin-solarhotwater

Controller for solar powered hot water generation

## Description

**solarhotwater** implements a simple algorithm which seeks to use
surplus energy from a small solar power array to ensure that as far
as possible hot water reamains available from a thermal store.

## Configuration

The plugin recognises the following configuration properties.

Property                 | Description | Default value
------------------------ | --- | ---
heatercontrolpath        | Signal K path which will have its value set to 1 when water heating should be ON and 0 when heating should be OFF. | 'electrical.switches.solarhotwater'
batterysocpath           | The Signal K path which reports battery SOC. | ''
batterysocstartthreshold | The SOC at which the controller should start heating (if other conditions are met). | 1.0
batterysocstopthreshold  | The SOC at which the controller should stop heating. | 0.95
solarpowerpath           | The Signal K path which reports solar output in Watts. | ''
solarpowerthreshold      | The solar panel output in Watts above which heating should be allowed. | 400

