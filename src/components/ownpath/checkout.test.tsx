// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import Checkout from "./checkout";
const id="11111111-1111-4111-8111-111111111111";
const order={id,reference:123456,amount:79000,currency:"VND",state:"pending",checkoutUrl:"http://127.0.0.3:4350/pay/fixture",startsAt:null,endsAt:null,retryAt:"2026-10-22T00:00:00Z",illustrative:true};
afterEach(()=>{cleanup();vi.unstubAllGlobals();history.replaceState(null,"","/");});
it("explains a lost creation response without claiming failure to persist, and retries the same intent",async()=>{
 const fetch=vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce(Response.json(order));vi.stubGlobal("fetch",(url:string,options:RequestInit)=>options?.method==='POST'?fetch(url,options):Promise.resolve(Response.json(order)));
 render(<Checkout signedIn enabled price={79000} mode="LOCAL_FAKE"/>);fireEvent.click(screen.getByRole("button",{name:"Create order"}));
 const error=await screen.findByRole("alert");expect(error.textContent).toContain("An order may already exist");expect(error.textContent).not.toContain("Failed to fetch");const intent=new URLSearchParams(location.search).get("intent");expect(intent).toBeTruthy();expect(screen.getByRole("link",{name:"Check existing orders ↗"}).getAttribute("target")).toBe("_blank");
 fireEvent.click(screen.getByRole("button",{name:"Create order"}));await screen.findByRole("heading",{name:"Order 123456"});expect(JSON.parse(fetch.mock.calls[0][1].body).key).toBe(intent);expect(JSON.parse(fetch.mock.calls[1][1].body).key).toBe(intent);expect(fetch).toHaveBeenCalledTimes(2);
});
it("keeps an acknowledged pending order and checkout link through a failed status request",async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(Response.json(order)).mockRejectedValueOnce(new TypeError("Failed to fetch"));vi.stubGlobal("fetch",(url:string,options:RequestInit)=>options?.method==='POST'?fetch(url,options):Promise.resolve(Response.json(order)));
 render(<Checkout signedIn enabled price={79000} mode="LOCAL_FAKE"/>);fireEvent.click(screen.getByRole("button",{name:"Create order"}));await screen.findByRole("heading",{name:"Order 123456"});
 fireEvent.click(screen.getByRole("button",{name:"I have paid / Check payment"}));await screen.findByRole("alert");expect(screen.getByRole("alert").textContent).toContain("Your order is kept");expect(screen.getByRole("heading",{name:"Order 123456"})).toBeTruthy();expect(screen.getByRole("link",{name:"Open hosted checkout ↗"}).getAttribute("href")).toBe(order.checkoutUrl);expect(new URLSearchParams(location.search).get("order")).toBe(id);
});
it("does not double-submit while a creation request is unresolved",async()=>{
 let finish!:(response:Response)=>void;const fetch=vi.fn(()=>new Promise<Response>(resolve=>{finish=resolve;}));vi.stubGlobal("fetch",(_url:string,options:RequestInit)=>options?.method==='POST'?fetch():Promise.resolve(Response.json(order)));render(<Checkout signedIn enabled price={79000} mode="LOCAL_FAKE"/>);const button=screen.getByRole("button",{name:"Create order"});act(()=>{fireEvent.click(button);fireEvent.click(button);});await waitFor(()=>expect(fetch).toHaveBeenCalledOnce());await act(async()=>finish(Response.json(order)));await screen.findByRole("heading",{name:"Order 123456"});
});
