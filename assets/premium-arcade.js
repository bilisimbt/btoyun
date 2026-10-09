(()=>{
 let modulePromise=null,moduleObject=null,request=0;
 window.openPremiumGame=async id=>{const ticket=++request;try{modulePromise??=import('./play/host.js?v=20');moduleObject=await modulePromise;if(ticket===request)await moduleObject.open(id);}catch{if(ticket===request)toast('Oyun dosyaları yüklenemedi. Sayfayı yenileyip tekrar dene.');}};
 window.stopPremiumGame=()=>{request++;moduleObject?.stop();};
})();
