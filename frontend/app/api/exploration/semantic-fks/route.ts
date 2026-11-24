// SPDX-FileCopyrightText: Copyright (c) 2026 workdd
// SPDX-License-Identifier: Apache-2.0

import { proxyToBackend } from '@/auth/proxy-backend';
import { withPermission } from '@/auth/with-auth';

// explorationApi.getSemanticFks — every semantic foreign key with how compilation resolved it.
export const GET = withPermission({ catalog: ['read'] })((req) => proxyToBackend(req));
