import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Gamepad2, Play, Pause, RotateCcw, X } from 'lucide-react'

// ========== 游戏常量 ==========
const GRID_SIZE = 20          // 20×20 网格
const CELL_SIZE = 18          // 每格像素
const TICK_MS = 140           // 蛇移动间隔（毫秒），越小越快
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE // 360px

// 方向向量
const DIR = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
}

type Position = { x: number; y: number }
type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover'

// ========== 工具函数 ==========

// 生成不在蛇身上的随机位置
function randomFood(snake: Position[]): Position {
  const occupied = new Set(snake.map(p => `${p.x},${p.y}`))
  let pos: Position
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    }
  } while (occupied.has(`${pos.x},${pos.y}`))
  return pos
}

// 初始蛇：中间位置，长度 3，向右
function initialSnake(): Position[] {
  const mid = Math.floor(GRID_SIZE / 2)
  return [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ]
}

// ========== 组件 ==========

interface SnakeGameProps {
  onClose: () => void
}

const SnakeGame: React.FC<SnakeGameProps> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // React 状态（用于 UI 显示）
  const [status, setStatus] = useState<GameStatus>('idle')
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() =>
    parseInt(localStorage.getItem('snake_high_score') || '0', 10)
  )

  // Ref 状态（游戏循环里实时读取，避免闭包过期）
  const snakeRef = useRef<Position[]>(initialSnake())
  const foodRef = useRef<Position>(randomFood(snakeRef.current))
  const dirRef = useRef<typeof DIR.RIGHT>(DIR.RIGHT)       // 当前方向
  const nextDirRef = useRef<typeof DIR.RIGHT>(DIR.RIGHT)   // 缓冲方向（防同一帧内掉头）
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const statusRef = useRef<GameStatus>('idle')

  // ---------- 绘制 ----------
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const snake = snakeRef.current
    const food = foodRef.current

    // 深色背景
    ctx.fillStyle = '#1E293B'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    // 网格线
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL_SIZE, 0); ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i * CELL_SIZE); ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE); ctx.stroke()
    }

    // 食物（发光红点）
    const fx = food.x * CELL_SIZE + CELL_SIZE / 2
    const fy = food.y * CELL_SIZE + CELL_SIZE / 2
    ctx.fillStyle = '#EF4444'
    ctx.shadowColor = '#EF4444'
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.arc(fx, fy, CELL_SIZE / 2 - 1.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // 蛇身
    snake.forEach((seg, i) => {
      const sx = seg.x * CELL_SIZE
      const sy = seg.y * CELL_SIZE

      if (i === 0) {
        // 蛇头：亮绿
        ctx.fillStyle = '#4ADE80'
        ctx.shadowColor = '#4ADE80'
        ctx.shadowBlur = 6
      } else {
        // 蛇身：渐暗
        const alpha = 1 - (i / (snake.length + 8)) * 0.5
        ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`
        ctx.shadowBlur = 0
      }

      const pad = 1
      const r = i === 0 ? 4 : 3
      ctx.beginPath()
      ctx.moveTo(sx + pad + r, sy + pad)
      ctx.lineTo(sx + CELL_SIZE - pad - r, sy + pad)
      ctx.quadraticCurveTo(sx + CELL_SIZE - pad, sy + pad, sx + CELL_SIZE - pad, sy + pad + r)
      ctx.lineTo(sx + CELL_SIZE - pad, sy + CELL_SIZE - pad - r)
      ctx.quadraticCurveTo(sx + CELL_SIZE - pad, sy + CELL_SIZE - pad, sx + CELL_SIZE - pad - r, sy + CELL_SIZE - pad)
      ctx.lineTo(sx + pad + r, sy + CELL_SIZE - pad)
      ctx.quadraticCurveTo(sx + pad, sy + CELL_SIZE - pad, sx + pad, sy + CELL_SIZE - pad - r)
      ctx.lineTo(sx + pad, sy + pad + r)
      ctx.quadraticCurveTo(sx + pad, sy + pad, sx + pad + r, sy + pad)
      ctx.fill()
      ctx.shadowBlur = 0
    })

    // 暂停遮罩
    if (statusRef.current === 'paused') {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 24px -apple-system, "PingFang SC", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('已暂停', CANVAS_SIZE / 2, CANVAS_SIZE / 2)
    }

    // 结束遮罩
    if (statusRef.current === 'gameover') {
      ctx.fillStyle = 'rgba(0,0,0,0.65)'
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
      ctx.fillStyle = '#FCA5A5'
      ctx.font = 'bold 22px -apple-system, "PingFang SC", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('游戏结束', CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 12)
      ctx.fillStyle = '#CBD5E1'
      ctx.font = '14px -apple-system, "PingFang SC", sans-serif'
      ctx.fillText(`得分: ${score}`, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 18)
    }
  }, [score])

  // ---------- 游戏结束 ----------
  const gameOver = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
    statusRef.current = 'gameover'
    setStatus('gameover')
    draw()
  }, [draw])

  // ---------- 每帧逻辑 ----------
  const tick = useCallback(() => {
    const dir = nextDirRef.current
    dirRef.current = dir
    const snake = snakeRef.current
    const head = snake[0]

    const newHead: Position = { x: head.x + dir.x, y: head.y + dir.y }

    // 撞墙
    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
      gameOver(); return
    }

    // 撞自己
    if (snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
      gameOver(); return
    }

    const newSnake = [newHead, ...snake]

    // 吃到食物？
    if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
      snakeRef.current = newSnake
      foodRef.current = randomFood(newSnake)
      setScore(s => {
        const ns = s + 10
        setHighScore(prev => {
          if (ns <= prev) return prev
          localStorage.setItem('snake_high_score', String(ns))
          return ns
        })
        return ns
      })
    } else {
      newSnake.pop() // 没吃到就去尾
      snakeRef.current = newSnake
    }

    draw()
  }, [draw, gameOver])

  // ---------- 开始 ----------
  const startGame = useCallback(() => {
    if (statusRef.current === 'idle' || statusRef.current === 'gameover') {
      snakeRef.current = initialSnake()
      foodRef.current = randomFood(snakeRef.current)
      dirRef.current = DIR.RIGHT
      nextDirRef.current = DIR.RIGHT
      setScore(0)
    }
    statusRef.current = 'playing'
    setStatus('playing')
    if (tickRef.current) clearInterval(tickRef.current)
    tickRef.current = setInterval(tick, TICK_MS)
    draw()
  }, [tick, draw])

  // ---------- 暂停 ----------
  const pauseGame = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
    statusRef.current = 'paused'
    setStatus('paused')
    draw()
  }, [draw])

  // ---------- 键盘 ----------
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // 空格/回车 → 开始/暂停
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (statusRef.current === 'playing') pauseGame()
        else startGame()
        return
      }

      if (statusRef.current !== 'playing') return

      const dir = dirRef.current
      let newDir: { x: number; y: number } | null = null

      switch (e.key.toLowerCase()) {
        case 'arrowup': case 'w': newDir = DIR.UP; break
        case 'arrowdown': case 's': newDir = DIR.DOWN; break
        case 'arrowleft': case 'a': newDir = DIR.LEFT; break
        case 'arrowright': case 'd': newDir = DIR.RIGHT; break
        case 'escape': pauseGame(); return
      }

      if (newDir) {
        e.preventDefault()
        // 禁止掉头
        if (!(newDir.x === -dir.x && newDir.y === -dir.y)) {
          nextDirRef.current = newDir
        }
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [startGame, pauseGame])

  // 卸载清理
  useEffect(() => {
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [])

  // 初始画面
  useEffect(() => { draw() }, [draw])

  // ========== 渲染 ==========
  return (
    <div className="snake-backdrop" onClick={onClose}>
      <div className="snake-container" onClick={e => e.stopPropagation()}>
        {/* 顶栏 */}
        <div className="snake-header">
          <h3><Gamepad2 size={20} strokeWidth={2} />贪吃蛇</h3>
          <button className="snake-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* 主体 */}
        <div className="snake-body">
          {/* 分数 */}
          <div className="snake-scorebar">
            <div className="snake-score-item">
              <span className="snake-score-label">分数</span>
              <span className="snake-score-value">{score}</span>
            </div>
            <div className="snake-score-item">
              <span className="snake-score-label">最高</span>
              <span className="snake-score-value best">{highScore}</span>
            </div>
          </div>

          {/* 画布 */}
          <div className="snake-canvas-wrap">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="snake-canvas"
            />
          </div>

          {/* 按钮 */}
          <div className="snake-actions">
            {status === 'playing' ? (
              <button className="snake-btn pause" onClick={pauseGame}>
                <Pause size={16} strokeWidth={2.5} />暂停
              </button>
            ) : (
              <button className="snake-btn start" onClick={startGame}>
                {status === 'gameover' ? (
                  <><RotateCcw size={16} strokeWidth={2.5} />重新开始</>
                ) : (
                  <><Play size={16} strokeWidth={2.5} />开始游戏</>
                )}
              </button>
            )}
          </div>

          {/* 操作提示 */}
          <div className="snake-tips">
            <span>↑↓←→ / WASD 移动</span>
            <span>空格 开始/暂停</span>
            <span>Esc 暂停</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SnakeGame
