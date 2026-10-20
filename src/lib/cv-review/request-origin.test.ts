import {expect,it} from "vitest";
import {sameOrigin} from "./request-origin";
it("accepts exact origins and the bounded numeric loopback normalization",()=>{
 expect(sameOrigin(new Request("https://ownpath.example/api",{headers:{origin:"https://ownpath.example"}}))).toBe(true);
 expect(sameOrigin(new Request("http://localhost:4386/api",{headers:{origin:"http://127.0.0.1:4386",host:"127.0.0.1:4386"}}))).toBe(true);
 for(const origin of ["https://evil.test","http://127.0.0.1:9999","http://127.0.0.1:4386/path","null"])expect(sameOrigin(new Request("http://localhost:4386/api",{headers:{origin,host:"127.0.0.1:4386"}}))).toBe(false);
});
