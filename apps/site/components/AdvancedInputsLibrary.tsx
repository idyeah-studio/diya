'use client'
import {useState} from 'react'
import {AtomicSidebar} from './AtomicSidebar'
import { PreviewOptions } from './PreviewControls'
import { LibraryActions } from './customize/LibraryActions'
import { CustomizationScope } from './customize/CustomizationScope'
import {DatePicker,type DateRange} from '@idyeah/diya'
import {Combobox} from '@idyeah/diya'
import './GalleryStudy.css'
import './ComponentLibrary.css'
import './ButtonLibrary.css'
import './TextInputLibrary.css'
const teams=[{value:'design',label:'Design'},{value:'engineering',label:'Engineering'},{value:'product',label:'Product'},{value:'marketing',label:'Marketing'},{value:'operations',label:'Operations'},{value:'archive',label:'Archived team',disabled:true}]
function AdvancedInputLibrary({kind}:{kind:'date-picker'|'combobox'}){
 const [mode,setMode]=useState('Single');const [size,setSize]=useState<'small'|'medium'|'large'>('medium');const [label,setLabel]=useState(true);const [helper,setHelper]=useState(true);const [state,setState]=useState('Default');const [dates,setDates]=useState<DateRange>({start:'',end:''});const [date,setDate]=useState('');const [selection,setSelection]=useState<string[]>([]);const [choice,setChoice]=useState('')
 const modes=kind==='date-picker'?['Single','Range']:['Single','Multiple'];const title=kind==='date-picker'?'Date Picker':'Combobox';
 return <main id="content" className="gallery-study component-library button-library advanced-input-library" data-area="components"><div className="gallery-study-backdrop" aria-hidden="true"/><AtomicSidebar current={kind}/><div className="component-document"><header className="component-document-heading"><LibraryActions id={kind} /><h2>{title}</h2></header><div className="component-preview-stage input-specimens"><div className="input-preview-controls">
 <fieldset className="button-control-group"><legend>Type</legend><div className="button-mini-switch">{modes.map(item=><label key={item}><input type="radio" name={`${kind}-type`} checked={mode===item} onChange={()=>{setMode(item);setDates({start:'',end:''});setDate('');setSelection([]);setChoice('')}}/><span>{item}</span></label>)}</div></fieldset>
 <fieldset className="button-control-group"><legend>Size</legend><div className="button-mini-switch">{(['small','medium','large'] as const).map(item=><label key={item}><input type="radio" name={`${kind}-size`} checked={size===item} onChange={()=>setSize(item)}/><span>{item[0].toUpperCase()+item.slice(1)}</span></label>)}</div></fieldset>
 <PreviewOptions className="input-options-group" items={[{label:'Label',checked:label,onChange:setLabel},{label:'Helper text',checked:helper,onChange:setHelper}]}/>
 <fieldset className="button-control-group"><legend>State</legend><div className="button-mini-switch">{['Default','Error','Disabled'].map(item=><label key={item}><input type="radio" name={`${kind}-state`} checked={state===item} onChange={()=>setState(item)}/><span>{item}</span></label>)}</div></fieldset>
 </div><CustomizationScope id={kind}><section className="input-example" aria-label={`${title} preview`}>{kind==='date-picker'?(()=>{const shared={size,hideLabel:!label,disabled:state==='Disabled',helperText:helper?'Select the dates for your project.':undefined,error:state==='Error'?'Choose a valid date to continue.':undefined};return mode==='Range'?<DatePicker {...shared} label="Reporting period" range value={dates} onValueChange={setDates}/>:<DatePicker {...shared} label="Due date" value={date} onValueChange={setDate}/>})():(()=>{const shared={label:'Team',options:teams,size,hideLabel:!label,disabled:state==='Disabled',helperText:helper?'Search and choose your project team.':undefined,error:state==='Error'?'Choose a team to continue.':undefined};return mode==='Multiple'?<Combobox {...shared} multiple value={selection} onValueChange={setSelection}/>:<Combobox {...shared} value={choice} onValueChange={setChoice}/>})()}</section></CustomizationScope></div></div></main>
}
export function DatePickerLibrary(){return <AdvancedInputLibrary kind="date-picker"/>}
export function ComboboxLibrary(){return <AdvancedInputLibrary kind="combobox"/>}
