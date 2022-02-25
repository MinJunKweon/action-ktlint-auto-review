const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const { exec } = require('child_process');

const REPORT_FILENAME = 'report.json'

const fetchGithubEvent = () => {
    const githubEventPath = fs.readFileSync(process.env.GITHUB_EVENT_PATH);
    return JSON.parse(githubEventPath);
}

const context = (() => {
    const event = fetchGithubEvent();

    const owner = process.env.GITHUB_REPOSITORY_OWNER;
    const repo = event.repository.name;
    const pullRequestNo = event.number;

    return { owner, repo, pullRequestNo }
})();

const fetchChangedKotlinFiles = async (octokit) => {
    const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
        owner: context.owner,
        repo: context.repo,
        pull_number: context.pullRequestNo,
    });
    console.log('::group::files');
    console.log(files);
    console.log('::endgroup::');

    const ktFiles = files
        .filter((file) => {
            const filename = file.filename;
            return filename.endsWith('.kt') || filename.endsWith('.kts');
        });

    return ktFiles
}

const extractFilenames = (files) => files.map((file) => file.filename)

const extractDiffs = (files) => {
    const diffs = {};
    for (const idx in files) {
        const file = files[idx];
        diffs[file.filename] = file.patch.split('\n')
            .filter((line) => line.startsWith('@'))
            .map((chunkHeader) => {
                const result = chunkHeader.match(/\+([0-9]+),([0-9]+)/)
                return { startLine: parseInt(result[1]), endLine: parseInt(result[2]) };
            });
    }
    return diffs;
}

const runKtlint = async (filenames) => {
    const workspace = process.env.GITHUB_WORKSPACE;
    const filepaths = filenames.map((filename) => workspace.concat('/', filename));
    const filepathArgument = ''.concat('"', filepaths.join('" "'), '"');

    return new Promise((resolve, reject) => {
        // run ktlint
        const command = `ktlint --reporter=json,output=${REPORT_FILENAME} --relative --verbose ${filepathArgument}`
        console.log(command);
        exec(command, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}

const readLintResults = () => {
    const reportJson = fs.readFileSync(REPORT_FILENAME);
    return JSON.parse(reportJson);
}

const printResultOfFile = (resultFile) => {
    const filename = resultFile.file;
    resultFile.errors.forEach(error => {
        const location = `${error.line}:${error.column}`;
        const message = error.message;
        console.log(`${filename}:${location} :: ${message} (${error.rule})`);
    });
}

const printResult = (result) => {
    console.log('::group::result');
    result.forEach(printResultOfFile);
    console.log('::endgroup::');
}

const createReviewComment = (filename, violation) => {
    const rule = violation.rule || 'INVALID KOTLIN FILE';
    const comment = `:warning: **${rule}**\n\n${violation.message}`;
    return {
        path: filename,
        body: comment,
        line: violation.line,
    };
}

const isInDiff = (diffs, line) => {
    for (const idx in diffs) {
        const diff = diffs[idx];
        if (diff.startLine <= line && diff.endLine >= line) {
            return true;
        }
    }
    return false;
}

const postGithubReview = async (octokit, diffs, results) => {
    const reviewComments = results.flatMap(result => {
        const filename = result.file;
        return result.errors
            .filter(violation => isInDiff(diffs[filename], violation.line))
            .map(violation => createReviewComment(filename, violation))
    })

    await octokit.rest.pulls.createReview({
        owner: context.owner,
        repo: context.repo,
        pull_number: context.pullRequestNo,
        body: `:hammer: **[ktlint]** There are ${reviewComments.length} violations`,
        event: 'REQUEST_CHANGES',
        comments: reviewComments,
    });
}

const main = async () => {
    const token = core.getInput('github_token') || process.env.INPUT_GITHUB_TOKEN;
    const octokit = github.getOctokit(token);

    const ktFiles = await fetchChangedKotlinFiles(octokit);
    const filenames = extractFilenames(ktFiles);

    console.log("::group::Lint Files");
    filenames.map((filename) => console.log(filename));
    console.log("::endgroup::");

    try {
        await runKtlint(filenames);
        return;
    } catch (err) {
        const results = readLintResults();
        const diffs = extractDiffs(ktFiles);
        printResult(results);
        try {
            await postGithubReview(octokit, diffs, results);
            console.log('Succeed to post Github PR Review');
        } catch (err) {
            console.log('Failed to post Github PR Review.');
            throw err;
        }
    }
}

main();
