const LOCATIONIQ_KEY = "pk.dcb0addbf59eb8bb3705cc55e553bdb2";

const map = L.map("mapa").setView([-23.55, -46.63], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

let marker=null, circle=null;

async function geocodeCEP(cep) {
  // 1) ViaCEP
  const v = await fetch(`https://viacep.com.br/ws/${cep}/json/`).then(r=>r.json());
  if (v.erro) throw new Error("CEP inválido no ViaCEP.");

  // 2) LocationIQ – busca estruturada (prioriza CEP no Brasil)
  const params = new URLSearchParams({
    key: LOCATIONIQ_KEY,
    format: "json",
    addressdetails: "1",
    dedupe: "1",
    normalizecity: "1",
    countrycodes: "br",
    postalcode: cep,
    country: "Brazil",
    city: v.localidade || "",
    state: v.uf || "",
    street: v.logradouro || ""
  });
  const data = await fetch(`https://us1.locationiq.com/v1/search?${params}`).then(r=>r.json());
  console.log("LocationIQ estruturado:", data);

  if (Array.isArray(data) && data.length) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), via: v };
  }
  throw new Error("Não foi possível localizar o CEP no mapa.");
}

function atualizarRaio(lat,lng){
  const km = Number(document.getElementById("raio").value||0);
  if(!km) return;
  if (circle) circle.remove();
  circle = L.circle([lat,lng],{ radius: km*1000, color:"#3DBE34", fillColor:"#3DBE34", fillOpacity:0.2 }).addTo(map);
  map.fitBounds(circle.getBounds());
}

// CEP → mapa + preencher campos
document.getElementById("cep").addEventListener("blur", async e=>{
  const cep = e.target.value.replace(/\D/g,"");
  if(cep.length!==8) return;

  try{
    const {lat,lng,via} = await geocodeCEP(cep);

    // preencher inputs usando ViaCEP
    const bairroEl = document.getElementById("bairro");
    const endEl = document.getElementById("enderecoBase");
    if (bairroEl) bairroEl.value = via.bairro || "";
    if (endEl) endEl.value = [via.logradouro, via.complemento].filter(Boolean).join(", ");

    if (marker) marker.remove();
    marker = L.marker([lat,lng]).addTo(map);

    atualizarRaio(lat,lng);
  }catch(err){
    console.error(err);
    alert("Não foi possível localizar o CEP no mapa.");
  }
});

document.getElementById("raio").addEventListener("input", ()=>{
  if (marker){
    const {lat,lng}=marker.getLatLng();
    atualizarRaio(lat,lng);
  }
});
