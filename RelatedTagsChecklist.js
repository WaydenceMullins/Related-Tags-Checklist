// ==UserScript==
// @name         Related Tags Checklist
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  Adds customizable checklist to quick tags
// @author       Waydence
// @match        https://e621.net/posts/*
// @match        https://e621.net/uploads/new*
// @match        https://e926.net/posts/*
// @match        https://e926.net/uploads/new*
// @icon         https://cdn.jsdelivr.net/gh/WaydenceMullins/Related-Tags-Checklist@main/icon64.png
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @tag          e6
// ==/UserScript==
'use strict';

const defaultRtcSections = [
 {'ttl':'Examples','itms':['~Character count','solo','duo','trio','group','','solo_focus','duo_focus','trio_focus','','zero_pictured'],'warn':'red NTS'},
 {'ttl':'Collapse when tag is enabled by click','itms':['tag2','tag13'],'coll':'tCl'},
 {'ttl':'Radio tag buttons','itms':['2024','2025','2026'],'rad':true},
 {'ttl':'Start collapsed','itms':['tag1','tag13'],'coll':'st'},
];

const collOpts = {
 'st':    'At start',
 'tCl':   'Tag enabled with click',
 'tInp':  'Tag typed into tagbox',
 'tAtSt': 'Tag in tagbox at start',
};

let rtcRelSect, curTags, tagTextareas = document.getElementsByClassName('tag-textarea');

function GetCurTagStr(){return Array.from(tagTextareas).map(elm=>elm.value).join(' ')}

function CrElm(elmName, elmProperties, elmAttributes){
 let newElm = Object.assign(document.createElement(elmName), elmProperties);
 for (const attrName in elmAttributes) newElm.setAttribute(attrName, elmAttributes[attrName]);
 return newElm;
}

function ToggleRelItems(){event.target.parentNode.relItems?.classList?.toggle('collapsed')}

function TagOn(curTagObj, evtType){
 for (let elm of curTagObj.elms){
  if ((elm.colRules.tCl.val&&evtType.tagClick) || (elm.colRules.tInp.val&&evtType.tagStrInput&&!elm.classList.contains('tag-active')) || (elm.colRules.tAtSt.val&&evtType.rtcStart)) elm.relItems.classList.add('collapsed');
  elm.classList.add('tag-active');
 }
}

function TagOff(curTagObj){
 for (let elm of curTagObj.elms) elm.classList.remove('tag-active');
 for (let elm of tagTextareas) elm.value = elm.value.replace(curTagObj.re_remove, ' ');
}

function TagToggleClick(tagName, event){
 event.preventDefault();

 if (curTags[tagName].re_test.test(GetCurTagStr())) TagOff(curTags[tagName]);
 else {
  TagOn(curTags[tagName], {'tagClick': true});

  let mainTextarea = tagTextareas[tagTextareas.length-1];
  mainTextarea.value = mainTextarea.value.replace(/ *$/,` ${tagName} `);

  for (const otherTag of event.target.relItems.curSectTags.set) if (tagName !== otherTag) TagOff(curTags[otherTag]);
 }

 for (let elm of tagTextareas) elm.dispatchEvent(Object.assign(new Event('input'), {'dispatchedBy': 'relatedTagsChecklist'}));
}

function TagTextareaInput(){
 if (event && event.dispatchedBy === 'relatedTagsChecklist') return;
 let evtType = event && event.type === 'input' ? {'tagStrInput': true} : {'rtcStart': true};

 let curTagStr = GetCurTagStr();

 for (const tagName in curTags){
  if (curTags[tagName].re_test.test(curTagStr)) TagOn(curTags[tagName], evtType);
  else for (let elm of curTags[tagName].elms) elm.classList.remove('tag-active');
 }
}

function AddSectionAbove(){
 event.preventDefault();
 let pivotElm = event.target.relTitle || event.target.bottomSectAdd;

 let newRelTitle = BuildRelTitle({'ttl':''});
 newRelTitle.rtcRelSect = rtcRelSect;
 rtcRelSect.insertBefore(newRelTitle, pivotElm); // commonParentElm.insertBefore(elmToMove, pivotPointElm)

 let newRelItems = BuildRelItems({'itms':['']});
 rtcRelSect.insertBefore(newRelItems, pivotElm);

 newRelTitle.relItems = newRelItems;
 newRelItems.relTitle = newRelTitle;
}

function MoveSectionUp(){
 event.preventDefault();
 let pivotElm = event.target.relTitle?.previousElementSibling?.relTitle;
 if (!pivotElm) return;
 rtcRelSect.insertBefore(event.target.relTitle, pivotElm);
 rtcRelSect.insertBefore(event.target.relTitle.relItems, pivotElm);
}

function MoveSectionDown(){
 event.preventDefault();
 let pivotElm = event.target.relTitle?.relItems?.nextElementSibling?.relItems?.nextElementSibling;
 if (!pivotElm) return;
 rtcRelSect.insertBefore(event.target.relTitle, pivotElm);
 rtcRelSect.insertBefore(event.target.relTitle.relItems, pivotElm);
}

function RemoveSection(){
 event.preventDefault();
 let notEmpty = event.target.relTitle.relTitleTextarea.value.trim() !== '' && event.target.relTitle.relItems.relItemsTextarea.value.trim() !== '';
 if (notEmpty && !confirm('Delete section?')) return;
 event.target.relTitle.relItems.remove();
 event.target.relTitle.remove();
}

function ConfigSection(){
 event.preventDefault();

 if (event.target.relTitle.sectConfDialog){
  event.target.relTitle.sectConfDialog.remove();
  delete event.target.relTitle.sectConfDialog;
  return;
 }

 let sectConfDialog = CrElm('div', {'className': 'sectConfDialog', 'relTitle': event.target.relTitle});

 let radioLabel = CrElm('label', {'innerText': 'Radio buttons'});
 let radioChBox = CrElm('input', {'checked': event.target.relTitle.relItems.curSectTags.isRadio}, {'type': 'checkbox'});
 event.target.relTitle.relItems.curSectTags.chBox = radioChBox;
 radioLabel.prepend(radioChBox);
 sectConfDialog.append(radioLabel);

 sectConfDialog.append(CrElm('label', {'innerText': 'Collapse section'}));

 for (let collOpt in collOpts){
  let chBoxLabel = CrElm('label', {'innerText': collOpts[collOpt]});
  let chBox = CrElm('input', {'checked': event.target.relTitle.relItems.collapseRules[collOpt].val}, {'type': 'checkbox'});
  event.target.relTitle.relItems.collapseRules[collOpt].chBox = chBox;
  chBoxLabel.prepend(chBox);
  sectConfDialog.append(chBoxLabel);
 }

 sectConfDialog.append(CrElm('button', {'innerText': 'Save', 'relTitle': event.target.relTitle, 'onclick': SaveSectionConfig}));
 event.target.relTitle.sectConfDialog = sectConfDialog;
 event.target.relTitle.append(sectConfDialog);
}

function SaveSectionConfig(){
 event.preventDefault();

 let curRelItems = event.target.relTitle.relItems;
 for (let colRule in curRelItems.collapseRules) curRelItems.collapseRules[colRule].chBox.checked ? curRelItems.collapseRules[colRule].val=true : curRelItems.collapseRules[colRule].val=false;

 curRelItems.curSectTags.chBox.checked ? curRelItems.curSectTags.isRadio=true : curRelItems.curSectTags.isRadio=false;

 event.target.relTitle.sectConfDialog.remove();
 delete event.target.relTitle.sectConfDialog;
}

function BuildRelTitle(sectConf){
 sectConf.ttl = String(sectConf.ttl).trim();

 let relTitle = CrElm('div', {'className': 'related-title'});

 let titleBtns = CrElm('div', {'className': 'titleBtns'});
 titleBtns.append(CrElm('button', {'className': 'sectUp', 'relTitle': relTitle, 'innerText': '▲', 'onclick': MoveSectionUp}));
 titleBtns.append(CrElm('button', {'className': 'sectDown', 'relTitle': relTitle, 'innerText': '▼', 'onclick': MoveSectionDown}));
 titleBtns.append(CrElm('button', {'className': 'sectAdd', 'relTitle': relTitle, 'innerText': '✚', 'onclick': AddSectionAbove}));
 titleBtns.append(CrElm('button', {'className': 'sectConf', 'relTitle': relTitle, 'innerText': '🛠', 'onclick': ConfigSection}));
 titleBtns.append(CrElm('button', {'className': 'sectDel', 'relTitle': relTitle, 'innerText': '✖', 'onclick': RemoveSection}));
 relTitle.append(titleBtns);

 let titleSpan = CrElm('span', {'innerText': sectConf.ttl, 'onclick': ToggleRelItems});
 relTitle.titleSpan = titleSpan;
 relTitle.append(titleSpan);

 let relTitleTextarea = CrElm('textarea', {'value': sectConf.ttl, 'style': 'height: 1rem; min-height: 1rem', 'spellcheck': false});
 relTitleTextarea.addEventListener('input', AutoResizeTitle);
 relTitle.relTitleTextarea = relTitleTextarea;
 relTitle.append(relTitleTextarea);

 return relTitle;
}

function BuildRelItems(sectConf){
 let curTagStr = GetCurTagStr();
 if (sectConf.itms instanceof Array === false) sectConf.itms = [undefined];

 let relItems = CrElm('div', {'className': 'related-items'});
 relItems.curSectTags = {'isRadio': Boolean(sectConf.rad), 'set': new Set(), 'chBox': undefined};

 sectConf.coll = String(sectConf.coll);
 relItems.collapseRules = {};
 for (let confOpt in collOpts) relItems.collapseRules[confOpt] = {'val': new RegExp(`${confOpt}`).test(sectConf.coll), 'chBox': undefined};
 if (relItems.collapseRules.st.val) relItems.classList.add('collapsed');

 for (let confItm of sectConf.itms){
  confItm = String(confItm).trim();

  let relItem = CrElm('div', {'className': 'related-item'});

  if (confItm === '') relItem.className = 'separator';
  else if (confItm.startsWith('~')) Object.assign(relItem, {'innerText': confItm.slice(1), 'className': 'related-item subtitle'});
  else {
   confItm = confItm.replace(/ +/g, '_');

   let tagToggle = CrElm('a', {'className': 'tag-type-0', 'innerText': confItm, 'href': `/wiki_pages/show_or_new?title=${confItm}`, 'relItems': relItems, 'colRules': relItems.collapseRules, 'onclick': event=>{TagToggleClick(confItm, event)}});

   if (sectConf.rad) relItems.curSectTags.set.add(confItm);

   if (!curTags[confItm]) curTags[confItm] = {'elms': [], 're_test': new RegExp(`(?<!\\S)${RegExp.escape(confItm)}(?!\\S)`), 're_remove': new RegExp(` *(?<!\\S)${confItm}(?!\\S) *`, 'g')};
   curTags[confItm].elms.push(tagToggle);

   relItem.append(tagToggle);
  }
  relItems.append(relItem);
 }

 let relItemsTextarea = CrElm('textarea', {'value': sectConf.itms.join('\n'), 'style': 'height: 1rem; min-height: 1rem', 'spellcheck': false});
 relItemsTextarea.addEventListener('input', AutoResizeItms);
 relItems.relItemsTextarea = relItemsTextarea;
 relItems.append(relItemsTextarea);

 return relItems;
}

function BuildChecklist(){
 curTags = {};
 rtcRelSect.innerHTML = '';

 let rtcMenu = CrElm('div', {'id': 'rtcMenu', 'innerText': 'RTC'});
 for (const btnName of ['Edit', 'Save', 'Cancel']){
  let menuBtn = CrElm('a', {'id': `rtc${btnName}`, 'innerText': btnName, 'href': ''});
  rtcRelSect[`rtc${btnName}`] = menuBtn;
  rtcMenu.append(menuBtn);
 }
 rtcRelSect.rtcEdit.onclick = EditChecklist;
 rtcRelSect.append(rtcMenu);

 for (const sectConf of GM_getValue('rtcSections', defaultRtcSections)){
  let relTitle = BuildRelTitle(sectConf);
  relTitle.rtcRelSect = rtcRelSect;
  rtcRelSect.append(relTitle);

  let relItems = BuildRelItems(sectConf);
  rtcRelSect.append(relItems);

  relTitle.relItems = relItems;
  relItems.relTitle = relTitle;
 }
 let bottomSectAdd = CrElm('span', {'className': 'bottomSectAdd'});
 bottomSectAdd.append(CrElm('button', {'innerText': '✚', 'onclick': AddSectionAbove, 'bottomSectAdd': bottomSectAdd}));
 rtcRelSect.append(bottomSectAdd);

 TagTextareaInput();
}

function SetTextareaHeight(targetElm, desiredHeightElm){
 targetElm.style.height = `${desiredHeightElm.clientHeight}px`;
 let lineCount = desiredHeightElm.titleSpan ? desiredHeightElm.titleSpan.getClientRects().length : targetElm.value.split('\n').length;
 targetElm.style.lineHeight = `${(desiredHeightElm.clientHeight / lineCount).toFixed(3)}px`;
}

function HandleWeirdHeightThing(targetElm){ // element's scrollHeight can sometimes be a pixel or two taller than its clientHeight
 setTimeout(()=>{ // workaround for Chrome initially giving incorrect height values https://stackoverflow.com/questions/3374877/using-jquery-why-do-ie-chrome-initially-give-incorrect-clientheight-and-scrollhe
  let heightDiff = targetElm.scrollHeight - targetElm.clientHeight;
  if (heightDiff < 1) return;
  targetElm.style.height = `${targetElm.scrollHeight}px`;
  targetElm.style.marginTop = `-${heightDiff / 2}px`;
  targetElm.style.marginBottom = `-${heightDiff / 2}px`;
 }, 1);
}

function EditChecklist(){
 event.preventDefault();
 let sectsToEdit = document.querySelectorAll('#rtcRelSect .related-title');
 for (const curRelTitle of sectsToEdit){
  curRelTitle.relItems.classList.remove('collapsed')
  SetTextareaHeight(curRelTitle.relTitleTextarea, curRelTitle);

  SetTextareaHeight(curRelTitle.relItems.relItemsTextarea, curRelTitle.relItems);
  curRelTitle.relItems.relItemsTextarea.style.width = `${curRelTitle.relItems.scrollWidth + 5}px`;
  curRelTitle.relItems.relItemsTextarea.style.minWidth = `${curRelTitle.relItems.scrollWidth}px`;
 }
 rtcRelSect.setAttribute('edit', 'true');
 for (const curRelTitle of sectsToEdit){
  HandleWeirdHeightThing(curRelTitle.relTitleTextarea);
  HandleWeirdHeightThing(curRelTitle.relItems.relItemsTextarea);
  if (curRelTitle.relItems.relItemsTextarea.scrollWidth !== curRelTitle.relItems.relItemsTextarea.clientWidth) curRelTitle.relItems.relItemsTextarea.dispatchEvent(new Event('input'));
 }
 rtcRelSect.rtcEdit.onclick = null;
 rtcRelSect.rtcSave.onclick = SaveChecklistEdit;
 rtcRelSect.rtcCancel.onclick = CancelChecklistEdit;
}

function CancelChecklistEdit(){
 event.preventDefault();
 BuildChecklist();
 rtcRelSect.setAttribute('edit', 'false');
}

function SaveChecklistEdit(){
 event.preventDefault();
 let rtcSections = [];
 for (const curRelTitle of rtcRelSect.querySelectorAll('.related-title')){
  let relItemsStr = curRelTitle.relItems.relItemsTextarea.value;
  if (relItemsStr.trim() === '') relItemsStr = 'undefined';
  let sectConf = {'ttl': curRelTitle.relTitleTextarea.value.trim(), 'itms': relItemsStr.split('\n').map(itm=>itm.trim())};
  if (sectConf.ttl.trim() === '') sectConf.ttl = 'undefined';
  let collArr = [];
  for (let colRule in curRelTitle.relItems.collapseRules) if (curRelTitle.relItems.collapseRules[colRule].val) collArr.push(colRule);
  if (collArr.length) sectConf.coll = collArr.join(' ');
  if (curRelTitle.relItems.curSectTags.isRadio) sectConf.rad = true;
  rtcSections.push(sectConf);
 }
 GM_setValue('rtcSections', rtcSections);
 BuildChecklist();
 rtcRelSect.setAttribute('edit', 'false');
}

function AutoResizeTitle(){
 this.style.height = '0';
 this.style.height = `${this.scrollHeight}px`;
}

function AutoResizeItms(){
 this.style.height = '0';
 this.style.height = `${this.scrollHeight}px`;
 this.style.width = '0';
 this.style.width = `${this.scrollWidth + 5}px`;
}

new MutationObserver(mutationRecordList=>{
 for (let mutRec of mutationRecordList){
  if ([...mutRec.addedNodes].some(node=>{return node.classList?.contains('related-tags') || (node.children && node.getElementsByClassName('related-tags').length)})){
   rtcRelSect = CrElm('div', {'className': 'related-section', 'id': 'rtcRelSect'}, {'edit': 'false'});

   BuildChecklist();

   let relTags = document.querySelector('.related-tags');
   relTags.prepend(rtcRelSect);

   for (let elm of tagTextareas){
    elm.removeEventListener('input', TagTextareaInput);
    elm.addEventListener('input', TagTextareaInput);
   }
  }
 }
}).observe(document.querySelector('#tag-string-editor, #uploader'), {subtree: true, childList: true});

GM_addStyle(`
#rtcRelSect {
 max-height: 80vh; flex-basis: 10rem !important; min-width: min-content; overflow-y: auto; padding: 0 0.4rem 0 0;
 textarea {display: block}
 #rtcMenu {
  min-width: 100%; display: flex; gap: .2rem; background: var(--color-section-lighten-5); position: sticky; top: 0; z-index: 1;
  #rtcEdit, #rtcSave {margin-left: auto}
 }
 .related-title {position: relative}
 .related-items {
  .subtitle {white-space: pre}
  .separator {margin: 3px 0 0; height: 1px; background: rgba(0,0,0,.15)}
 }
}
#rtcRelSect[edit='false'] {
 #rtcSave, #rtcCancel, textarea, .titleBtns, .bottomSectAdd {display: none}
 .collapsed {height: .25rem;
  div {visibility:hidden}
 }
}
#page #rtcRelSect[edit='true'] {
 #rtcEdit {display: none}
 .related-title, .related-items {
  border-color: #fff2;
  span, div {display: none}
  textarea {resize: none; margin: 0; min-width: 2rem; min-height: 1rem; background: transparent; font-size: inherit; font-family: inherit}
 }
 .related-title {
  outline: 1px solid #fff2; outline-offset: -1px;
  .sectConfDialog {
  display: block; padding: 0 0 .1rem .1rem;
  label {display: block; font-weight: 1}
  }
 }
 .related-title textarea {min-width: 100%; color: var(--color-text); padding: 0; line-height: 1.25em; font-weight: 700}
 .related-items textarea {padding: 0 0 0 4px; color: var(--color-tag-general); white-space: pre}
 .related-title:hover .titleBtns {
  z-index: 2; position: absolute; bottom: 100%; width: 100%; display: flex; gap: 1px;
  button {flex: 1; margin-bottom: 1px; max-height: 1.3rem}
 }
 #rtcMenu + .related-title .titleBtns .sectUp {display: none}
 .related-title:has(+ div:last-of-type) .titleBtns .sectDown {display: none}
 .bottomSectAdd {
  width: 100%;
  button {width: 3rem}
 }
}
`);
