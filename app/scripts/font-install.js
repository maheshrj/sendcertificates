const { exec } = require("child_process");

const installFonts = () => {
    // Set environment variables and pre-accept EULA
    const commands = [
        // Pre-accept EULA
        "sudo echo ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true | sudo debconf-set-selections",
        // Install fonts with noninteractive frontend
        "sudo DEBIAN_FRONTEND=noninteractive apt-get install -y fonts-liberation ttf-mscorefonts-installer"
    ].join(" && ");

    exec(commands, {
        env: {
            ...process.env,
            DEBIAN_FRONTEND: "noninteractive"
        }
    }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error occurred: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Error output: ${stderr}`);
        }
        console.log(`Command output:\n${stdout}`);
    });
};

installFonts();