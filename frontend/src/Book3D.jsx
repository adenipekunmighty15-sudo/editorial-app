import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { BOOK_META, createPageTexture, paginateText } from './bookContent'

const SHEETS = 12
const PAGE_W = 1.35
const PAGE_H = 2.0
const SHEET_T = 0.014
const COVER_T = 0.055
const COVER_W = PAGE_W + 0.07
const COVER_H = PAGE_H + 0.14
const OPEN_ANGLE = -Math.PI
const TURN_SPEED = 7
const COVER_SPEED = 5
const TAP_SLOP = 8
const TAP_MS = 450

function makeTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

function createCoverArtTexture() {
  const W = 700
  const H = 1000
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const bg = ctx.createRadialGradient(W / 2 - 80, 240, 40, W / 2, H / 2, H * 0.95)
  bg.addColorStop(0, '#7a3d28')
  bg.addColorStop(0.55, '#5c2d1d')
  bg.addColorStop(1, '#3f1e14')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  ctx.globalAlpha = 0.08
  ctx.strokeStyle = '#000000'
  for (let i = -H; i < W; i += 18) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + H, H)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  ctx.strokeStyle = 'rgba(214,180,120,0.75)'
  ctx.lineWidth = 3
  ctx.strokeRect(46, 46, W - 92, H - 92)
  ctx.lineWidth = 1
  ctx.strokeRect(60, 60, W - 120, H - 120)

  ctx.fillStyle = '#d9b877'
  ctx.textAlign = 'center'
  ctx.font = '700 26px "DM Sans", sans-serif'
  ctx.fillText('R O O T E D', W / 2, 180)

  ctx.beginPath()
  ctx.arc(W / 2, 320, 46, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(214,180,120,0.9)'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.font = '52px Georgia, serif'
  ctx.fillStyle = '#e2c489'
  ctx.fillText('R', W / 2, 340)

  ctx.font = '500 58px Georgia, serif'
  ctx.fillStyle = '#e6cc95'
  ctx.fillText('The Practice', W / 2, 520)
  ctx.fillText('of Presence', W / 2, 585)

  ctx.font = '20px "DM Sans", sans-serif'
  ctx.fillStyle = 'rgba(226,196,137,0.8)'
  ctx.fillText('A  R E A D I N G  E D I T I O N', W / 2, 650)

  ctx.strokeStyle = 'rgba(214,180,120,0.6)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(W / 2 - 60, 700)
  ctx.lineTo(W / 2 + 60, 700)
  ctx.stroke()

  ctx.font = 'italic 24px Georgia, serif'
  ctx.fillStyle = 'rgba(226,196,137,0.7)'
  ctx.fillText('“Read deeply. Live fully.”', W / 2, 780)

  ctx.font = '16px "DM Sans", sans-serif'
  ctx.fillStyle = 'rgba(226,196,137,0.55)'
  ctx.fillText('D I G I T A L  S A N C T U A R Y', W / 2, 900)

  return makeTexture(canvas)
}

function createEndpaperTexture(label, note) {
  const W = 640
  const H = 900
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const bg = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, W)
  bg.addColorStop(0, '#6d3325')
  bg.addColorStop(1, '#3a1b13')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  ctx.globalAlpha = 0.16
  ctx.strokeStyle = '#d9b877'
  for (let i = -H; i < W; i += 26) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + H, H)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  ctx.strokeStyle = 'rgba(214,180,120,0.5)'
  ctx.lineWidth = 2
  ctx.strokeRect(40, 40, W - 80, H - 80)

  ctx.fillStyle = '#e6cc95'
  ctx.textAlign = 'center'
  ctx.font = 'italic 40px Georgia, serif'
  ctx.fillText(label, W / 2, H / 2 - 20)
  ctx.font = '20px "DM Sans", sans-serif'
  ctx.fillStyle = 'rgba(226,196,137,0.75)'
  ctx.fillText(note, W / 2, H / 2 + 40)

  return makeTexture(canvas)
}

function createShadowTexture() {
  const S = 256
  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')
  const grad = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  grad.addColorStop(0, 'rgba(40,22,10,0.55)')
  grad.addColorStop(0.55, 'rgba(40,22,10,0.22)')
  grad.addColorStop(1, 'rgba(40,22,10,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, S, S)
  return makeTexture(canvas)
}

export default function Book3D() {
  const mountRef = useRef(null)
  const rigRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState('')
  const [opened, setOpened] = useState(false)
  const [turned, setTurned] = useState(0)
  const [bookmark, setBookmark] = useState(null)
  const [immersive, setImmersive] = useState(false)
  const [chromeVisible, setChromeVisible] = useState(true)

  const totalSpreads = SHEETS

  useLayoutEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    const rig = {
      disposed: false,
      targets: { opened: false, turned: 0 },
      sheets: [],
      cover: null,
      bookmarkMesh: null,
      bookmarkSpread: null,
      currentOpen: 0,
      requestRender: () => {},
    }
    rigRef.current = rig

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
    camera.position.set(0, 0.6, 3.8)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    mount.appendChild(renderer.domElement)

    const pmrem = new THREE.PMREMGenerator(renderer)
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04)
    scene.environment = envRT.texture

    // Sanctuary Lighting: Warm, directional, and intimate
    scene.add(new THREE.HemisphereLight(0xfffcf0, 0x2a1810, 0.4))
    
    const key = new THREE.DirectionalLight(0xffe6c2, 2.0)
    key.position.set(-4, 5, 6)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.near = 1
    key.shadow.camera.far = 20
    key.shadow.camera.left = -5
    key.shadow.camera.right = 5
    key.shadow.camera.top = 5
    key.shadow.camera.bottom = -5
    key.shadow.bias = -0.0005
    scene.add(key)

    const rim = new THREE.DirectionalLight(0xa9c4ff, 0.8)
    rim.position.set(5, 2, -5)
    scene.add(rim)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = false
    controls.minDistance = 2.0
    controls.maxDistance = 6
    controls.minPolarAngle = 0.1
    controls.maxPolarAngle = Math.PI * 0.6
    controls.target.set(0, 0, 0)

    let userAdjusted = false
    controls.addEventListener('start', () => {
      userAdjusted = true
    })

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 4),
      new THREE.MeshBasicMaterial({
        map: createShadowTexture(),
        transparent: true,
        depthWrite: false,
      }),
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.position.set(0.1, -1.14, 0)
    scene.add(shadow)

    const bookRoot = new THREE.Group()
    bookRoot.position.y = -0.1
    bookRoot.rotation.y = 0.18
    scene.add(bookRoot)

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    let downPoint = null
    const onPointerDown = (event) => {
      downPoint = { x: event.clientX, y: event.clientY, t: performance.now() }
    }
    const onPointerUp = (event) => {
      if (!downPoint) return
      const dragDistance = Math.hypot(event.clientX - downPoint.x, event.clientY - downPoint.y)
      const heldMs = performance.now() - downPoint.t
      downPoint = null
      if (dragDistance > TAP_SLOP || heldMs > TAP_MS) return

      const rect = mount.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(bookRoot.children, true)
      if (!hits.length) return

      if (!rig.targets.opened) {
        setOpened(true)
        return
      }
      if (hits[0].point.x > 0) {
        nextPage()
      } else {
        prevPage()
      }
    }
    mount.addEventListener('pointerdown', onPointerDown)
    mount.addEventListener('pointerup', onPointerUp)

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect()
      if (!width || !height) return
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      if (!userAdjusted) {
        const vHalf = THREE.MathUtils.degToRad(camera.fov) / 2
        const distH = 1.25 / Math.tan(vHalf)
        const distW = 1.62 / (Math.tan(vHalf) * camera.aspect)
        const dist = Math.max(distH, distW, 3.1)
        camera.position.set(0, dist * 0.12, dist)
        controls.target.set(0, 0, 0)
      }
      camera.updateProjectionMatrix()
      rig.requestRender()
    }

    let frame = 0
    let last = performance.now()
    let running = false
    let dirty = true
    const clock = { value: 0 }
    const EPSILON = 0.0006

    const animate = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      clock.value += dt

      let active = false

      const coverTarget = rig.targets.opened ? OPEN_ANGLE : 0
      if (Math.abs(coverTarget - rig.currentOpen) > EPSILON) {
        rig.currentOpen += (coverTarget - rig.currentOpen) * (1 - Math.exp(-COVER_SPEED * dt))
        active = true
      } else {
        rig.currentOpen = coverTarget
      }
      if (rig.cover) rig.cover.rotation.y = rig.currentOpen

      rig.sheets.forEach((sheet, index) => {
        const target = index < rig.targets.turned ? OPEN_ANGLE : 0
        if (Math.abs(target - sheet.current) > EPSILON) {
          sheet.current += (target - sheet.current) * (1 - Math.exp(-TURN_SPEED * dt))
          active = true
        } else {
          sheet.current = target
        }
        const remaining = Math.abs(sheet.current - target) / Math.PI
        const lift = Math.sin(Math.min(remaining, 1) * Math.PI) * 0.06
        sheet.mesh.rotation.y = sheet.current
        sheet.mesh.rotation.z = lift
        const spin = Math.abs(sheet.current) / Math.PI
        sheet.front.visible = spin < 0.5
        sheet.back.visible = spin >= 0.5
      })

      if (rig.bookmarkMesh) {
        rig.bookmarkMesh.visible = rig.bookmarkSpread !== null && rig.targets.opened
        if (rig.bookmarkMesh.visible) {
          const targetZ = 0.09 - rig.bookmarkSpread * 0.014
          const dz = targetZ - rig.bookmarkMesh.position.z
          if (Math.abs(dz) > 0.0005) {
            rig.bookmarkMesh.position.z += dz * (1 - Math.exp(-6 * dt))
            rig.bookmarkMesh.position.y = Math.sin(clock.value * 2.2) * 0.02
            active = true
          } else {
            rig.bookmarkMesh.position.z = targetZ
            rig.bookmarkMesh.position.y +=
              (0 - rig.bookmarkMesh.position.y) * (1 - Math.exp(-6 * dt))
            if (Math.abs(rig.bookmarkMesh.position.y) > 0.001) active = true
          }
        }
      }

      const moved = controls.update()

      if (dirty || active || moved) {
        renderer.render(scene, camera)
        dirty = false
      }

      if (active || moved) {
        frame = requestAnimationFrame(animate)
      } else {
        running = false
      }
    }

    const requestRender = () => {
      dirty = true
      if (!running) {
        running = true
        last = performance.now()
        frame = requestAnimationFrame(animate)
      }
    }
    rig.requestRender = requestRender
    controls.addEventListener('change', requestRender)

    const loader = new GLTFLoader()
    loader.load(
      `${import.meta.env.BASE_URL || '/'}book.glb`,
      (gltf) => {
        if (rig.disposed) return
        const model = gltf.scene
        model.traverse((child) => {
          if (/clasp/i.test(child.name || '')) {
            child.visible = false
            return
          }
          if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = false
            if (child.material) {
              child.material.envMapIntensity = 0.5
              child.material.needsUpdate = true
            }
          }
        })
        bookRoot.add(model)

        rig.cover = model.getObjectByName('Cover_Front')

        const coverArt = new THREE.Mesh(
          new THREE.PlaneGeometry(COVER_W * 0.96, COVER_H * 0.96),
          new THREE.MeshPhysicalMaterial({
            map: createCoverArtTexture(),
            roughness: 0.4,
            metalness: 0.1,
            clearcoat: 0.3,
            clearcoatRoughness: 0.2,
            envMapIntensity: 0.6,
          }),
        )
        coverArt.position.set(COVER_W / 2, 0, COVER_T / 2 + 0.002)
        rig.cover.add(coverArt)

        const frontEndpaper = new THREE.Mesh(
          new THREE.PlaneGeometry(COVER_W * 0.9, COVER_H * 0.9),
          new THREE.MeshPhysicalMaterial({
            map: createEndpaperTexture('Ex Libris', 'This book belongs to'),
            roughness: 0.9,
            clearcoat: 0,
          }),
        )
        frontEndpaper.rotation.y = Math.PI
        frontEndpaper.position.set(COVER_W / 2 - 0.02, 0, -COVER_T / 2 - 0.002)
        rig.cover.add(frontEndpaper)

        const backCover = model.getObjectByName('Cover_Back')
        if (backCover) {
          const backEndpaper = new THREE.Mesh(
            new THREE.PlaneGeometry(COVER_W * 0.9, COVER_H * 0.9),
            new THREE.MeshPhysicalMaterial({
              map: createEndpaperTexture('Rooted', 'Read deeply. Live fully.'),
              roughness: 0.9,
              clearcoat: 0,
            }),
          )
          backEndpaper.position.set(COVER_W / 2 - 0.02, 0, COVER_T / 2 + 0.002)
          backCover.add(backEndpaper)
        }

        for (let i = 1; i <= SHEETS; i += 1) {
          const name = `Page_${String(i).padStart(3, '0')}`
          const mesh = model.getObjectByName(name)
          if (!mesh) continue

          const rectoPage = BOOK_PAGES[(i - 1) * 2]
          const versoPage = BOOK_PAGES[(i - 1) * 2 + 1]

          const frontTexture = makeTexture(
            createPageTexture(rectoPage, { pageNumber: (i - 1) * 2 + 1, side: 'right' }),
          )
          const backTexture = makeTexture(
            createPageTexture(versoPage, { pageNumber: (i - 1) * 2 + 2, side: 'left' }),
          )

          const front = new THREE.Mesh(
            new THREE.PlaneGeometry(PAGE_W * 0.94, PAGE_H * 0.96),
            new THREE.MeshPhysicalMaterial({ 
                map: frontTexture, 
                roughness: 0.8, 
                clearcoat: 0, 
                sheen: 0.5,
                sheenRoughness: 0.8
            }),
          )
          front.position.set(PAGE_W / 2, 0, SHEET_T / 2 + 0.0015)
          mesh.add(front)

          const back = new THREE.Mesh(
            new THREE.PlaneGeometry(PAGE_W * 0.94, PAGE_H * 0.96),
            new THREE.MeshPhysicalMaterial({ 
                map: backTexture, 
                roughness: 0.8, 
                clearcoat: 0,
                sheen: 0.5,
                sheenRoughness: 0.8
            }),
          )
          back.rotation.y = Math.PI
          back.position.set(PAGE_W / 2, 0, -SHEET_T / 2 - 0.0015)
          mesh.add(back)

          // Gold Leaf Trim: Adds a metallic gold edge to the page block
          const goldTrim = new THREE.Mesh(
            new THREE.BoxGeometry(0.005, PAGE_H * 0.96, SHEET_T * 2),
            new THREE.MeshPhysicalMaterial({ 
                color: 0xffd700, 
                metalness: 1.0, 
                roughness: 0.2, 
                emissive: 0x443300,
                emissiveIntensity: 0.2
            })
          )
          goldTrim.position.set(PAGE_W, 0, 0)
          mesh.add(goldTrim)

          rig.sheets.push({ mesh, front, back, current: 0, index: i - 1 })
        }

        const ribbon = model.getObjectByName('Ribbon')
        if (ribbon) {
          ribbon.visible = false
          if (ribbon.material) {
            ribbon.material.transparent = true
            ribbon.material.opacity = 0
            ribbon.material.depthWrite = false
          }
        }

        rig.bookmarkMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.16, 0.012),
          new THREE.MeshStandardMaterial({
            color: 0xd9b877,
            metalness: 0.7,
            roughness: 0.3,
            emissive: 0x3a2a10,
            emissiveIntensity: 0.4,
          }),
        )
        rig.bookmarkMesh.position.set(PAGE_W + 0.015, 0, 0.09)
        rig.bookmarkMesh.visible = false
        bookRoot.add(rig.bookmarkMesh)

        resize()
        setReady(true)
        requestRender()
      },
      undefined,
      () => {
        if (!rig.disposed) setFailed('Could not load the 3D book model.')
      },
    )

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(mount)
    requestRender()

    return () => {
      rig.disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()
      pmrem.dispose()
      envRT.dispose()
      mount.removeEventListener('pointerdown', onPointerDown)
      mount.removeEventListener('pointerup', onPointerUp)
      scene.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose()
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          materials.forEach((material) => {
            if (!material) return
            material.map?.dispose()
            material.dispose()
          })
        }
      })
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement)
      }
      if (rigRef.current === rig) rigRef.current = null
    }
  }, [])

  useEffect(() => {
    if (rigRef.current) {
      rigRef.current.targets.opened = opened
      rigRef.current.requestRender?.()
    }
  }, [opened])

  useEffect(() => {
    if (rigRef.current) {
      rigRef.current.targets.turned = turned
      rigRef.current.requestRender?.()
    }
  }, [turned])

  useEffect(() => {
    if (rigRef.current) {
      rigRef.current.bookmarkSpread = bookmark
      rigRef.current.requestRender?.()
    }
  }, [bookmark])

  useEffect(() => {
    if (!immersive) {
      setChromeVisible(true)
      return undefined
    }
    let timer
    const wake = () => {
      setChromeVisible(true)
      clearTimeout(timer)
      timer = setTimeout(() => setChromeVisible(false), 2600)
    }
    wake()
    window.addEventListener('pointermove', wake)
    window.addEventListener('pointerdown', wake)
    window.addEventListener('keydown', wake)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('pointermove', wake)
      window.removeEventListener('pointerdown', wake)
      window.removeEventListener('keydown', wake)
    }
  }, [immersive])

  const closeBook = useCallback(() => {
    setOpened(false)
    setTurned(0)
  }, [])

  const nextPage = useCallback(() => {
    setOpened(true)
    setTurned((value) => Math.min(value + 1, totalSpreads))
  }, [totalSpreads])

  const prevPage = useCallback(() => {
    setTurned((value) => Math.max(value - 1, 0))
  }, [])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'ArrowRight') nextPage()
      else if (event.key === 'ArrowLeft') prevPage()
      else if (event.key === 'Escape') {
        if (immersive) setImmersive(false)
        else closeBook()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nextPage, prevPage, immersive, closeBook])

  const leftIndex = turned * 2 - 1
  const rightIndex = turned * 2
  const pageLabel =
    leftIndex < 0
      ? `Front matter · page ${rightIndex + 1}`
      : `Pages ${leftIndex + 1}–${rightIndex + 1} of ${BOOK_PAGES.length}`

  return (
    <div className={`book3d ${immersive ? 'is-immersive' : 'is-inline'}`}>
      <div className="book3d-stage">
        <div ref={mountRef} className="book3d-canvas" />
        {!ready && !failed && <div className="book3d-loading">Binding the book…</div>}
        {failed && <div className="book3d-loading error">{failed}</div>}

        <div className={`book3d-chrome ${chromeVisible ? '' : 'is-hidden'}`}>
          <header className="book3d-topbar">
            <div className="book3d-brand">
              <span className="book3d-brand-title">{BOOK_META.title}</span>
              <span className="book3d-page-label">{ready ? pageLabel : '—'}</span>
            </div>
            <div className="book3d-topactions">
              <button
                className={bookmark === turned ? 'bookmark-button active' : 'bookmark-button'}
                onClick={() => setBookmark((value) => (value === turned ? null : turned))}
                disabled={!ready}
                title={bookmark === turned ? 'Remove bookmark' : 'Bookmark this spread'}
                aria-label={bookmark === turned ? 'Remove bookmark' : 'Bookmark this spread'}
              >
                <IconBookmark />
              </button>
              {bookmark !== null && bookmark !== turned && (
                <button
                  className="text-button book3d-goto"
                  onClick={() => {
                    setOpened(true)
                    setTurned(bookmark)
                  }}
                >
                  Go to bookmark <ChevronArrow />
                </button>
              )}
              <button
                className="icon-button"
                onClick={() => setImmersive((value) => !value)}
                title={immersive ? 'Exit full screen (Esc)' : 'Read full screen'}
                aria-label={immersive ? 'Exit full screen' : 'Read full screen'}
              >
                {immersive ? <IconCollapse /> : <IconExpand />}
              </button>
            </div>
          </header>

          <footer className="book3d-controls">
            {!opened ? (
              <button className="primary-button" onClick={() => setOpened(true)} disabled={!ready}>
                Open the book
              </button>
            ) : (
              <button className="page-button" onClick={closeBook}>
                Close
              </button>
            )}
            <button
              className="page-button nav"
              onClick={prevPage}
              disabled={!opened || turned === 0}
              aria-label="Previous page"
            >
              <ChevronLeft />
            </button>
            <input
              className="book3d-slider"
              type="range"
              min="0"
              max={totalSpreads}
              value={turned}
              disabled={!ready}
              onChange={(event) => {
                setOpened(true)
                setTurned(Number(event.target.value))
              }}
              aria-label="Jump to page"
            />
            <button
              className="page-button nav"
              onClick={nextPage}
              disabled={!opened || turned === totalSpreads}
              aria-label="Next page"
            >
              <ChevronArrow />
            </button>
          </footer>
        </div>
      </div>
    </div>
  )
}

function ChevronArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

function ChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  )
}

function IconBookmark() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 3h12v18l-6-4.5L6 21z" />
    </svg>
  )
}

function IconExpand() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6" />
    </svg>
  )
}

function IconCollapse() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9h6V3M21 9h-6V3M3 15h6v6M21 15h-6v6" />
    </svg>
  )
}
