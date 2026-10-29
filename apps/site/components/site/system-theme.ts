/**
 * First visit on a launched page: no saved `diya-theme` cookie, so the page
 * follows the visitor's light or dark setting instead of the server's Dark.
 *
 * It runs while the HTML parses (SiteHeader renders it), before first paint.
 * It sets `html[data-theme]` to the resolved theme and marks the source as
 * `system`, then gives every DIYA provider root the same theme, including
 * the ones still to be parsed. AppearanceProvider takes over after mount and
 * keeps following the setting until a choice is saved. The countdown never
 * renders a SiteHeader, so it never runs this.
 */
export const SYSTEM_THEME_SCRIPT = `(function(){try{
var d=document.documentElement;
if(/(?:^|;\\s*)diya-theme=(?:light|dark)(?:;|$)/.test(document.cookie))return;
var t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
d.setAttribute('data-theme-source','system');
if(d.getAttribute('data-theme')===t)return;
d.setAttribute('data-theme',t);
var set=function(n){if(n.nodeType!==1)return;if(n.classList.contains('diya-root'))n.setAttribute('data-theme',t);var r=n.querySelectorAll('.diya-root');for(var i=0;i<r.length;i++)r[i].setAttribute('data-theme',t)};
set(d);
var o=new MutationObserver(function(m){for(var i=0;i<m.length;i++)for(var j=0;j<m[i].addedNodes.length;j++)set(m[i].addedNodes[j])});
o.observe(d,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',function(){set(d);o.disconnect()});
}catch(e){}})()`
