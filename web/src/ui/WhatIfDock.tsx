import { useState } from 'react'
import { useStore } from '../state/store'
import { markShockwave } from '../state/debug'
import { intervene } from '../api/client'
import type { Modifier } from '../sim/types'

let _n = 0
const nid = () => 'card-' + ++_n

export function WhatIfDock() {
  const ratings = useStore((s) => s.ratings)
  const modifiers = useStore((s) => s.modifiers)
  const addModifiers = useStore((s) => s.addModifiers)
  const removeModifier = useStore((s) => s.removeModifier)
  const clearModifiers = useStore((s) => s.clearModifiers)
  const view = useStore((s) => s.view)
  const [team, setTeam] = useState('BRA')
  const [text, setText] = useState('')
  const [pending, setPending] = useState(false)

  if (view === 'stadium') return null
  const teams = ratings?.teams.slice().sort((a, b) => a.name.localeCompare(b.name)) ?? []
  const imp = (c: string) =>
    Math.max(...(ratings?.teams.find((t) => t.code === c)?.keyPlayers.map((p) => p.importance) ?? [1]))

  const apply = (m: Modifier) => { markShockwave(); addModifiers([m]) }

  const teamCard = (kind: string) => {
    if (kind === 'injury') apply({ id: nid(), scope: 'team', target: team, field: 'strength', op: 'add', value: Number((-0.1 * imp(team)).toFixed(2)), label: `${team} key injury`, source: 'card' })
    if (kind === 'red') apply({ id: nid(), scope: 'team', target: team, field: 'strength', op: 'add', value: -0.12, label: `${team} red card`, source: 'card' })
    if (kind === 'formup') apply({ id: nid(), scope: 'team', target: team, field: 'strength', op: 'add', value: 0.1, label: `${team} form surge`, source: 'card' })
    if (kind === 'formdown') apply({ id: nid(), scope: 'team', target: team, field: 'strength', op: 'add', value: -0.1, label: `${team} slump`, source: 'card' })
  }

  async function ask() {
    if (!text.trim()) return
    setPending(true)
    try {
      const r = await intervene(text)
      markShockwave()
      if (r.modifiers?.length) addModifiers(r.modifiers)
    } finally {
      setPending(false)
      setText('')
    }
  }

  return (
    <div className="panel dock" data-testid="whatif-dock">
      <div className="h">What-if · rewrite fate</div>
      <div className="cards">
        <select value={team} onChange={(e) => setTeam(e.target.value)} data-testid="team-select">
          {teams.map((t) => (<option key={t.code} value={t.code}>{t.name}</option>))}
        </select>
        <button data-testid="card-injury" onClick={() => teamCard('injury')}>🤕 Injury</button>
        <button data-testid="card-red" onClick={() => teamCard('red')}>🟥 Red card</button>
        <button data-testid="card-formup" onClick={() => teamCard('formup')}>📈 Form +</button>
        <button data-testid="card-formdown" onClick={() => teamCard('formdown')}>📉 Form −</button>
        <button data-testid="card-host" onClick={() => apply({ id: nid(), scope: 'global', target: '*', field: 'homeAdv', op: 'add', value: 0.1, label: 'Host edge +', source: 'card' })}>🏟 Host edge</button>
        <button data-testid="card-weather" onClick={() => apply({ id: nid(), scope: 'round', target: '*', field: 'variance', op: 'mul', value: 1.4, label: 'Weather chaos', source: 'card' })}>🌧 Weather</button>
      </div>
      <div className="freetext">
        <input value={text} data-testid="whatif-input"
          placeholder="or type a what-if… 'it rains every knockout night'"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') ask() }} />
        <button onClick={ask} disabled={pending} data-testid="whatif-ask">{pending ? '…Granite' : 'Ask'}</button>
      </div>
      {modifiers.length > 0 && (
        <div className="chips">
          {modifiers.map((m) => (
            <span key={m.id} className={'chip ' + (m.source || '')} data-testid="modifier-chip">
              {m.label}<button onClick={() => removeModifier(m.id)}>✕</button>
            </span>
          ))}
          <button className="clear" onClick={clearModifiers} data-testid="clear-modifiers">clear all</button>
        </div>
      )}
    </div>
  )
}
