const body = {
    packageId: "test-expert-counselor",
    version: "0.1.0",
    displayName: "Expert Career Counselor",
    description: "A seasoned career advisor AI skill designed to help you navigate tech industry interviews and promotions.",
    authorName: "YigYaps Official",
    category: "other",
    tags: ["career", "advice", "tech"],
    maturity: "stable",
    license: "open-source",
    mcpTransport: "stdio"
};

fetch("http://localhost:3100/v1/packages", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer change_this_to_a_secure_random_string"
    },
    body: JSON.stringify(body)
}).then(async res => {
    if (!res.ok) {
        console.error("Failed:", await res.text());
    } else {
        console.log("Success:", await res.json());
    }
}).catch(console.error);
