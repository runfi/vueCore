const compileUtil = {
  getVal(expr, vm) {
    return expr.split('.').reduce((data, currentVal) => {
      // console.log('currentVal', currentVal)
      return data[currentVal]
    }, vm.$data)
  },
  setVal(expr, vm, inputVal) {
    return expr.split('.').reduce((data, currentVal) => {
      // console.log('currentVal', currentVal)
      data[currentVal] = inputVal
    }, vm.$data)
  },
  getContentVal(expr, vm) {
    return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
      return this.getVal(args[1], vm)
    })
  },
  text(node, expr, vm) {
    let value;
    if (expr.indexOf('{{') !== -1) {
      value = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
        // console.log(args)
        // 绑定观察者，将来数据发生变化，触发这里的回调，进行更新
        new Watcher(vm, args[1], () => {
          this.updater.textUpdater(node, this.getContentVal(expr, vm))
        })
        return this.getVal(args[1], vm)
      })
    } else {
      value = this.getVal(expr, vm)
    }
    this.updater.textUpdater(node, value)
  },
  html(node, expr, vm) {
    const value = this.getVal(expr, vm)
    // console.log('vm', vm)
    new Watcher(vm, expr, (newVal) => {
      this.updater.htmlUpdater(node, newVal)
    })
    this.updater.htmlUpdater(node, value)
  },
  model(node, expr, vm) {
    const value = this.getVal(expr, vm)
    // 绑定更新函数 数据=>视图
    new Watcher(vm, expr, (newVal) => {
      this.updater.modelUpdater(node, newVal)
    })
    // 视图 => 数据 => 视图
    node.addEventListener('input', (e) => {
      // 设置值
      this.setVal(expr, vm, e.target.value)
    })
    this.updater.modelUpdater(node, value)
  },
  on(node, expr, vm, eventName) {
    let fn = vm.$options.methods && vm.$options.methods[expr]
    node.addEventListener(eventName, fn.bind(vm), false)
  },
  bind(node, expr, vm, attr) {

  },
  // 更新函数
  updater: {
    textUpdater(node, value) {
      node.textContent = value
    },
    htmlUpdater(node, value) {
      node.innerHTML = value
    },
    modelUpdater(node, value) {
      node.value = value
    }
  }
}

// 编译
class Compile {
  constructor(el, vm) {
    this.el = this.isElementNode(el) ? el : document.querySelector(el)
    this.vm = vm
    // console.log(this.el)
    // 1、获取文档碎片对象，放入内存中会减少页面的回流和重绘
    const fragment = this.node2Fragment(this.el)
    // console.log(fragment)
    // 2、编译模板
    this.compile(fragment)
    // 3、追加自元素到根元素
    this.el.appendChild(fragment)
  }
  compile(fragment) {
    // 1、通过fragment获取子节点
    const childNodes = fragment.childNodes;
    [...childNodes].forEach(child => {
      // console.log(child)
      if (this.isElementNode(child)) {
        // 是元素节点
        // 编译元素节点
        this.compileElement(child)
      } else {
        this.compileText(child)
      }
      if (child.childNodes && child.childNodes.length) {
        this.compile(child)
      }
    })
  }

  compileElement(node) {
    // console.log(node)
    const attributes = node.attributes;
    // console.log(attributes);
    [...attributes].forEach(attr => {
      const { name, value } = attr
      if (this.isDirective(name)) { // 如果是一个指令 v-开头
        const [, directive] = name.split('-');
        const [dirName, eventName] = directive.split(':');
        // 更新数据
        compileUtil[dirName](node, value, this.vm, eventName)

        // 删除有指令的标签上的属性
        node.removeAttribute('v-' + directive)
      } else if (this.isEventName(name)) {  // 处理@click这种形式的事件触发
        const [, eventName] = name.split('@');
        compileUtil['on'](node, value, this.vm, eventName)
      }
    })
  }

  compileText(node) {
    // {{}}
    const content = node.textContent
    if (/\{\{(.+?)\}\}/.test(content)) {
      // console.log(content)
      compileUtil['text'](node, content, this.vm)
    }
  }

  node2Fragment(el) {
    // 创建文档碎片
    const f = document.createDocumentFragment()
    let firstChild;
    while (firstChild = el.firstChild) {
      f.appendChild(firstChild)
    }
    return f;
  }

  isElementNode(node) {
    return node.nodeType === 1
  }

  isDirective(attrName) {
    return attrName.startsWith('v-')
  }

  isEventName(attrName) {
    return attrName.startsWith('@')
  }
}


class MVue {
  constructor(options) {
    this.$el = options.el
    this.$data = options.data
    this.$options = options
    if (this.$el) {
      // 要有挂载节点，才进行数据的处理
      // TODO
      // 1、实现一个数据的观察者
      new Observer(this.$data)
      // 2、实现一个指令的解析器
      new Compile(this.$el, this)
      this.proxyData(this.$data)
    }
  }
  proxyData(data) {
    for (const key in data) {
      Object.defineProperty(this, key, {
        get() {
          return data[key]
        },
        set(newVal) {
          data[key] = newVal
        }
      })
    }
  }
}