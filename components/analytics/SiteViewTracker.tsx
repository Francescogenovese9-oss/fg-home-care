"use client";
import {useEffect} from "react";
export default function SiteViewTracker(){useEffect(()=>{const today=new Date().toISOString().slice(0,10);const key="fg_site_view_"+today;try{if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,"1")}catch{}void fetch("/api/site-view",{method:"POST",credentials:"same-origin"}).catch(()=>{})},[]);return null}
