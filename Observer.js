class Watcher {
  constructor(vm, expr, callback) {
    this.vm = vm
    this.expr = expr
    this.callback = callback
    // 先把旧值保存起来
    this.oldVal = this.getOldVal()
  }

  getOldVal() {
    Dep.target = this
    const oldVal = compileUtil.getVal(this.expr, this.vm)
    Dep.target = null
    return oldVal
  }

  update() {
    const newVal = compileUtil.getVal(this.expr, this.vm)
    if (newVal !== this.oldVal) {
      this.callback(newVal)
    }
  }
}

class Dep {
  constructor() {
    this.subs = [];
  }
  // 收集观察者
  addSub(watcher) {
    this.subs.push(watcher);
  }
  // 通知观察者去更新
  notify() {
    console.log('观察者', this.subs)
    this.subs.forEach(w => w.update())
  }
}

class Observer {
  constructor(data) {
    this.observer(data);
  }

  observer(data) {
    /*
      {
        person: {
          name: 'lance',
          fav: {
            a: '爱好'
          }
        }
      }
    */
    if (data && typeof data === 'object') {
      // console.log(Object.keys(data))
      Object.keys(data).forEach(key => {
        this.defineReactive(data, key, data[key])
      })
    }
  }

  defineReactive(obj, key, value) {
    // 递归遍历
    this.observer(value)
    const dep = new Dep()
    // 通过重写属性的get set，劫持并监听所有的属性
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: false,
      get() {
        // 初始化
        // 订阅数据变化时，往Dep中添加观察者
        Dep.target && dep.addSub(Dep.target)
        return value
      },
      set: (newVal) => {
        this.observer(newVal)
        if (newVal !== value) {
          value = newVal
        }
        // 告诉Dep通知变化
        dep.notify()
      }
    })
  }


}