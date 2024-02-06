class Store {
  constructor(initial) {
    this.value = initial;
    this.subscriptions = [];
  }

  Subscribe(handler) {
    if (typeof handler !== 'function') {
      throw new Error(`Subscription expects function but received handler of type ${typeof handler}`);
    }

    let id = crypto.randomUUID();

    this.subscriptions.push({ id, handler });

    const Unsubscribe_fn = () => {
      this.subscriptions = this.subscriptions.filter((s) => s.id != id);
    };

    return Unsubscribe_fn;
  }

  Notify() {
    const val = this.Get();
    for (const subscription of this.subscriptions) {
      subscription.handler(val);
    }
  }

  Set(new_value) {
    this.value = new_value;
    this.Notify();
  }

  Update(updater) {
    this.Set(updater(this.value));
  }

  Get() {
    return this.value;
  }

  get Value() {
    return this.Get();
  }
}

exports.Store = Store;

class ObjectStore extends Store {
  constructor(initial) {
    super(initial);

    if (typeof initial != 'object') {
      console.error(`object store requires initial value to be an object. Received ${typeof initial}`, initial);
    }
  }

  Update_Key(key, value) {
    this.value[key] = value;
    this.Notify();
  }

  Get_Key(key) {
    return this.value[key];
  }

  Get() {
    return Object.assign({}, this.value);
  }

  Set(new_value) {
    Object.assign(this.value, new_value);
    this.Notify();
  }

  Update(updater) {
    const clone = Object.assign({}, this.value);
    this.Set(updater(clone));
  }
}

exports.ObjectStore = ObjectStore;
