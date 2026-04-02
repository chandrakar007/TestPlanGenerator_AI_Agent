async function testOllama() {
    try {
        const tagsResp = await fetch('http://localhost:11434/api/tags');
        const tagsData = await tagsResp.json();
        console.log("Models:", tagsData.models.map(m => m.name));
        
        let model = tagsData.models.length > 0 ? tagsData.models[0].name : 'llama3.2:3b';
        console.log("Using model:", model);

        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                prompt: 'Test prompt',
                stream: false
            })
        });
        
        console.log("Status:", response.status, response.statusText);
        const txt = await response.text();
        console.log("Response:", txt);
    } catch(e) {
        console.error("Error:", e);
    }
}
testOllama();
