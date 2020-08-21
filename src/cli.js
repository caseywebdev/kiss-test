#!/usr/bin/env node

import kissTest from './index.js';

kissTest({ patterns: process.argv.slice(2) });
