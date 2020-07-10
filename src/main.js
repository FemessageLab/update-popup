import '@evillt/toast/dist/toast.css'
import {createToast} from '@evillt/toast'

main()

function main() {
  if (process.env.NODE_ENV !== 'production') return

  // 当前应用版本
  const currentVersion = process.env.VERSION || '1.0.0'
  // 上次访问时间 ms
  let lastSeenMS = 0

  const worker = new Worker('{{prefix}}/worker/version-checker.js', {
    name: 'worker-versionChecker',
  })

  let popupFlag = false

  checker()

  worker.onmessage = event => {
    const data = event.data
    const {version} = data

    if (compareVersion(version, currentVersion)) {
      if (popupFlag) return
      showRefreshPopup()
    }
  }

  document.addEventListener('visibilitychange', checker)
  // 关闭 worker
  window.addEventListener('beforeunload', () => dispatch('close'))

  function showRefreshPopup() {
    popupFlag = true

    dispatch('stopInterval')

    // 延后 1 秒显示以使得没有那么唐突
    setTimeout(() => {
      createToast('发现新版本可用', {
        action: {
          text: '刷新',
          callback: () => {
            window.location.reload()
          },
        },
      })
    }, 1000)
  }

  function checker() {
    if (popupFlag) return

    if (document.hidden) {
      // 离开时
      lastSeenMS = Date.now()
      dispatch('stopInterval')
    } else {
      const currentMS = Date.now()

      // 防止10秒之内频繁切换
      if (currentMS - lastSeenMS > 10000) {
        dispatch('immediate')
        dispatch('startInterval', {interval: 3600000})
      }
    }
  }

  function dispatch(cmd, options = {}) {
    worker.postMessage({cmd, ...options})
  }

  function compareVersion(newVersion, currentVersion) {
    if (newVersion && currentVersion) {
      const n = newVersion.split('.')
      const c = currentVersion.split('.')
  
      for (let i = 0; i <= n.length; i++) {
        if (Number(n[i]) > Number(c[i])) return true
      }
    }

    return false
  }
}
