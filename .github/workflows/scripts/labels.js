// This script is used to add labels to pull requests based on the title of the pull request.
// The title of the pull request is checked for specific keywords and based on the keyword, a label is added
// to the pull request. If the label does not exist, it is created and then added to the pull request.
module.exports = async ({ github, context }) => {

    const commits = await github.rest.pulls.listCommits({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: context.payload.pull_request.number,
    });

    for (const commit of commits.data) {

        const title = commit.commit.message.split('\n')[0].toLowerCase();

        const regex = /^(fix|feat|build|docs|test|chore)(\((\w+)\))?(!)?:\s.+$/;
        const match = title.match(regex);
        if (!match) continue;

        const type = match[1];
        const scope = match[3];
        const breaking = match[4] === "!";

        const config = {
            "fix": { name: "fix", description: "Fixes specific bug or issue", color: "FF1938" },
            "feat": { name: "feature", description: "Adds new features", color: "00EEBC" },
            "build": { name: "build", description: "Updates in build components", color: "04103A" },
            "docs": { name: "documentation", description: "Documentation updates", color: "19ABFF" },
            "test": { name: "test", description: "Test suite changes", color: "EBF0F6" },
            "chore": { name: "chore", description: "Other changes", color: "19ABFF" },
            "deps": { name: "dependencies", description: "Dependency updates", color: "FFE019" }
        };

        let labels = [];
        if (config[type]) labels.push(config[type]);
        if (config[scope]) labels.push(config[scope]);
        if (breaking) {
            labels.push({ name: "breaking change", description: "Introduces significant changes", color: "FFE019" });
        }

        if (labels.length === 0) continue;

        const existing = await github.rest.issues.listLabelsForRepo({
            owner: context.repo.owner,
            repo: context.repo.repo,
        });

        for (const label of labels) {
            const exists = existing.data.some(data => data.name === label.name);
            if (!exists) {
                await github.rest.issues.createLabel({
                    owner: context.repo.owner,
                    repo: context.repo.repo,
                    name: label.name,
                    color: label.color,
                    description: label.description,
                });
            }
        }

        await github.rest.issues.addLabels({
            issue_number: context.payload.pull_request.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            labels: labels.map(label => label.name),
        });

    }

};