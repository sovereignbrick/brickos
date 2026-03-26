---
number: 267
title: "fix: missing i18n keys for device types (fora6, qardio_arm, qardio_base)"
labels: [fix, frontend, i18n]
milestone: ux-and-onboarding
---

## Description

Console errors on measurement pages:
```
MISSING_MESSAGE: devices.deviceTypes.fora6 (en)
MISSING_MESSAGE: devices.deviceTypes.qardio_arm (en)
MISSING_MESSAGE: devices.deviceTypes.qardio_base (en)
```

Device type translations need to be added to EN + DE locale files.
