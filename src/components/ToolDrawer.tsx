import {useEffect,useRef,type ReactNode} from 'react'

export default function ToolDrawer({title,onClose,children}:{title:string;onClose():void;children:ReactNode}){
 const dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{const element=dialog.current,previous=document.activeElement as HTMLElement|null;element?.showModal();return()=>{element?.close();if(previous?.isConnected)previous.focus({preventScroll:true})}},[])
 return <dialog ref={dialog} className="tool-drawer" aria-label={title} onCancel={onClose} onClick={event=>{if(event.target===dialog.current){const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)onClose()}}}>
  <header className="tool-heading"><div><p className="eyebrow">YOUR LITTLE WORLD</p><h2>{title}</h2></div><button autoFocus aria-label="Close game tools" onClick={onClose}>×</button></header>
  <div className="tool-content">{children}</div>
 </dialog>
}
