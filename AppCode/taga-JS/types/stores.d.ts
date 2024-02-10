interface StoreSubscriptionHandler<T> {
  id: string;
  handler: (value: T) => any;
}

declare class Store<T> {
  value: T;
  subscriptions: StoreSubscriptionHandler[];

  constructor(v: T);

  Subscribe: (handler: (value: T) => any) => Function;

  Notify: () => void;

  Set: (new_value: T) => void;

  Update: (updater: (v: T) => T) => void;

  Get: () => T;
}

declare class ObjectStore<T extends object> extends Store<T> {
  Update_Key: <K extends keyof T>(key: K, value: T[K]) => void;

  Get_Key: <K extends keyof T>(key: K) => T[K];
}
