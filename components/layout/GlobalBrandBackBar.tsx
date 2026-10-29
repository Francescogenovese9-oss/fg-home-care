"use client";
import {usePathname} from "next/navigation";
import Header from "@/components/layout/Header";

const pagesWithOwnHeader=[
 "/","/chi-siamo","/servizi","/videoconsulti","/contatti",
 "/privacy","/termini-e-condizioni","/carta-dei-servizi"
];
export default function GlobalBrandBackBar(){
 const pathname=usePathname();
 if(pagesWithOwnHeader.includes(pathname)||pathname==="/login"||pathname==="/register")return null;
 return <Header/>;
}
