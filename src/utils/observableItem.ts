/*
 * Copyright (C) 2020 Maker Ecosystem Growth Holdings, INC.
 */

import { Observable } from 'rxjs';

export type ObservableItem<T> = T extends Observable<infer U> ? U : never;
