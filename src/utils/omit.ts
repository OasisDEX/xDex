/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
