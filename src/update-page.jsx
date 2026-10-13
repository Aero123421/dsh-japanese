import React, { useEffect, useSyncExternalStore } from 'react'
import { Button, IconChevronDownOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { UpdateController } from './update-controller.ts'
import { en, ja } from './update-copy.mjs'
import styles from './update-page.css'
import controlsCss from '../.cache/native-controls.css'
const NS = 'dsh.japanesePack'
export function UpdatePage({ updates, locale }) {
  useSyncExternalStore(listener => locale.subscribe(listener), () => locale.getSnapshot().revision)
  const view = useSyncExternalStore(updates.subscribe, updates.getSnapshot), t = locale.bind(NS)
  useEffect(() => { void updates.status() }, [updates])
  const busy = view.status === 'checking' || view.status === 'installing'
  return <section className="dsh-japanese-update-page">
    <h2>{t('title')}</h2>
    <p>{t('running')}: {view.running}{view.installed && view.installed !== view.running ? ` · ${t('installed')}: ${view.installed}` : ''}</p>
    <p role="status">{t(view.status)}{view.reason && <span> · {t(view.reason in en ? view.reason : 'other')}</span>}{view.stage && <span> · {t('stage')}: {view.stage}</span>}</p>
    {view.checkedAt && <p className="dsh-japanese-update-muted">{t('checked')}: {new Date(view.checkedAt).toLocaleString()}</p>}
    {view.candidate && view.status === 'available' && <><p>{view.running} → {view.candidate.version} · DSH {view.candidate.runtime}</p><p className="dsh-japanese-update-notes">{view.candidate.notes}</p><p className="dsh-japanese-update-muted">{t('pin')}</p></>}
    <div className="dsh-japanese-update-actions">
      <Button variant="outline" size="sm" disabled={busy || ['unavailable', 'unknown', 'restart-required'].includes(view.status)} onClick={() => { void updates.check() }}>{t('check')}</Button>
      {view.status === 'available' && <Button variant="primary" size="sm" onClick={() => { void updates.install() }}>{t('install')}</Button>}
      {view.status === 'unknown' && <Button variant="outline" size="sm" onClick={() => { void updates.status() }}>{t('reconcile')}</Button>}
      <a href="https://github.com/Aero123421/dsh-japanese/releases" target="_blank" rel="noreferrer">{t('releases')}</a>
    </div>
    <p className="dsh-japanese-update-muted">{t('languageHint')}</p>
  </section>
}
export function registerUpdatePage(ctx) {
  const updates = new UpdateController(ctx.connection)
  ctx.effect(() => () => updates.dispose())
  ctx.effect(() => ctx.locale.register(NS, { en, ja }))
  ctx.effect(() => {
    const style = document.createElement('style'); style.dataset.dshJapaneseUpdates = ''; style.textContent = controlsCss + styles; document.head.append(style)
    return () => style.remove()
  })
  ctx.on('connection/reset', () => updates.reset())
  ctx.slots.inject('settings.section', () => ctx.slots.register({ name: 'settings.section', id: 'dsh-japanese-pack', order: 16, label: () => ctx.locale.bind(NS)('nav'), icon: IconChevronDownOutlineRegular, inject: () => ({ updates, locale: ctx.locale }) }, UpdatePage))
}
