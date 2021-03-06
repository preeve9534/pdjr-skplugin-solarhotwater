# pdjr-skplugin-solarhotwater

Controller for solar powered hot water generation

## Description

**solarhotwater** implements a simple algorithm which seeks to use
surplus energy from a small solar power array to electrically heat
the hydronic fluid in a thermal store.

The plugin operates by monitoring paths which report the vessel's
instantaneous battery SOC and solar power output.
These readings are compared to user configured start and stop
thresholds and used to modulate the value of a key which it is
presumed will itself be used to operate the thermal store's
immersion heater.

By setting the start and stop thresholds to very conservative values
it is possible to maintain battery SOC whilst using any solar
over-production for water heating.

## Configuration

The plugin recognises the following configuration properties.

Property                 | Description | Default value
------------------------ | --- | ---
enablepath               | Signal K path which indicates whether or not the plugin should operate (value = 1 says 'yes', value = '0' says 'no') | 'control.solarhotwater.enabled'
outputpath               | Signal K path which will have its value set to 1 when water heating should be ON and 0 when heating should be OFF. | 'control.solarhotwater.output'
batterysocpath           | The Signal K path which reports battery SOC. | ''
batterysocstartthreshold | The SOC at which the controller should start heating (if other conditions are met). | 1.0
batterysocstopthreshold  | The SOC at which the controller should stop heating. | 0.98
solarpowerpath           | The Signal K path which reports solar output in Watts. | ''
solarpowerthreshold      | The solar panel output in Watts above which heating should be allowed. | 400

## Operation

1. The plugin heater control output is set to OFF (0) on startup.

2. The value of *enablepath* is a remote-control that determines
   whether (1) or not (0) the plugin should be enabled. Typically
   this value will be modulated by some external control interface.

3. Whilst *enablepath* is 1, the plugin checks the value on *batterysocpath*
   to see if it is above *batterysocstartthreshold* and if so, heater
   control is allowed and will remain allowed until the value on
   *batterysocpath* falls below *battersocstopthreshold*.

4. If heater control is both enabled and allowed, then the value on
   *solarpowerpath* is checked to see if it is greater than *solarpowerthreshold*
   and if so, *outputpath* is set to 1, otherwise 0.

Exactly how configuration settings are tailored to a particular hardware
installation is a matter of judgement and preference.
On my vessel with a large battery bank and small solar array it makes
sense to favour battery charge over water heating and I set the SOC start
threshold to 100% and stop threshold to 98%.

## Console messages

### Solar water heating is disabled

The value on *enablepath* is 0. Set this value to 1 to enable the plugin.

### Solar water heating is enabled and OFF (*the_reason_why*)

Heating is enabled, but the value on *outputpath* is 0 because one or more
of the operating constraints (described by *the_reason_why*) currently
applies.
If the constraint or constraints are no longer met, then *outputpath* will
be set to 1.

### Solar water heating is enabled and ON
