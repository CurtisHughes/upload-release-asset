jest.mock('@actions/core');
jest.mock('@actions/github');
jest.mock('fs');

const core = require('@actions/core');
const { GitHub, context } = require('@actions/github');
const fs = require('fs');
const run = require('../src/upload-release-asset');

/* eslint-disable no-undef */
describe('Upload Release Asset', () => {
  let getRelease;
  let uploadReleaseAsset;
  let content;

  beforeEach(() => {
    getRelease = jest.fn().mockReturnValueOnce({
      data: {
        upload_url: 'uploadUrl'
      }
    });
    uploadReleaseAsset = jest.fn().mockReturnValueOnce({
      data: {
        browser_download_url: 'browserDownloadUrl'
      }
    });

    fs.statSync = jest.fn().mockReturnValueOnce({
      size: 527
    });

    content = Buffer.from('test content');
    fs.readFileSync = jest.fn().mockReturnValueOnce(content);

    context.repo = {
      owner: 'owner',
      repo: 'repo'
    };

    const github = {
      repos: {
        uploadReleaseAsset,
        getRelease
      }
    };

    GitHub.mockImplementation(() => github);
  });

  test('Upload release asset endpoint is called', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('asset_path')
      .mockReturnValueOnce('asset_name')
      .mockReturnValueOnce('asset_content_type')
      .mockReturnValueOnce('upload_url');

    await run();

    expect(uploadReleaseAsset).toHaveBeenCalledWith({
      url: 'upload_url',
      headers: { 'content-type': 'asset_content_type', 'content-length': 527 },
      name: 'asset_name',
      file: content
    });
  });

  test('Output is set', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('asset_path')
      .mockReturnValueOnce('asset_name')
      .mockReturnValueOnce('asset_content_type')
      .mockReturnValueOnce('upload_url');

    core.setOutput = jest.fn();

    await run();

    expect(core.setOutput).toHaveBeenNthCalledWith(1, 'browser_download_url', 'browserDownloadUrl');
  });

  test('Action fails elegantly', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('asset_path')
      .mockReturnValueOnce('asset_name')
      .mockReturnValueOnce('asset_content_type')
      .mockReturnValueOnce('upload_url');

    uploadReleaseAsset.mockRestore();
    uploadReleaseAsset.mockImplementation(() => {
      throw new Error('Error uploading release asset');
    });

    core.setOutput = jest.fn();

    core.setFailed = jest.fn();

    await run();

    expect(uploadReleaseAsset).toHaveBeenCalled();
    expect(core.setFailed).toHaveBeenCalledWith('Error uploading release asset');
    expect(core.setOutput).toHaveBeenCalledTimes(0);
  });

  test('Upload url is optional', async () => {
    core.getInput = jest
      .fn()
      .mockReturnValueOnce('asset_path')
      .mockReturnValueOnce('asset_name')
      .mockReturnValueOnce('asset_content_type');

    core.setOutput = jest.fn();

    await run();

    expect(getRelease).toHaveBeenCalled();
    expect(core.setOutput).toHaveBeenNthCalledWith(1, 'browser_download_url', 'browserDownloadUrl');
  });
});
