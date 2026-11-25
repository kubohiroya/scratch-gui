// SPDX-License-Identifier: GPL-3.0-or-later
import {createRequire} from 'node:module';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const {chromium, expect} = require('@playwright/test');

test('the native paint UI shares system fonts between costumes and backdrops', {timeout: 45_000}, async t => {
    const args = ['--enable-unsafe-swiftshader'];
    if (process.platform === 'darwin') args.push('--single-process', '--no-zygote', '--disable-crash-reporter');
    const browser = await chromium.launch({headless: true, args});
    t.after(() => browser.close());
    const page = await browser.newPage({viewport: {width: 1360, height: 900}});
    page.setDefaultTimeout(8_000);
    const origin = 'http://gui.test';
    const build = fileURLToPath(new URL('../build/', import.meta.url));
    await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) return route.abort();
        const file = path.resolve(build, '.' + decodeURIComponent(url.pathname));
        if (!file.startsWith(build)) return route.abort();
        try {
            await route.fulfill({path: file});
        } catch {
            await route.abort();
        }
    });
    await page.goto(origin + '/editor.html?lang=en');
    await page.getByText('Costumes', {exact: true}).click();
    const selectText = () => page.getByRole('button', {name: 'Text', exact: true}).click();
    const dropdown = page.locator('[class*="dropdown_dropdown_"][class*="font-dropdown_font-dropdown_"]:visible');
    const dialog = page.getByRole('dialog', {name: 'Fonts', exact: true});
    const openFontList = async () => {
        await dropdown.click();
        await page.getByText('Add more fonts...', {exact: true}).click();
        await expect(dialog).toBeVisible();
    };
    const closeFontList = async () => {
        await dialog.getByRole('button', {name: 'Close', exact: true}).click();
        await expect(dialog).toBeHidden();
    };
    const addSystemFont = async name => {
        await openFontList();
        await dialog.getByRole('button', {name: /Add a system font/}).click();
        await dialog.getByPlaceholder('Wingdings').fill(name);
        await dialog.getByRole('button', {name: 'Add', exact: true}).click();
        await expect(dialog.getByText(name, {exact: true})).toBeVisible();
        await closeFontList();
    };
    const chooseFont = async name => {
        await dropdown.click();
        await page.getByText(name, {exact: true}).click();
        await expect(dropdown).toContainText(name);
    };
    await selectText();
    await addSystemFont('Tahoma');
    await page.locator('[class*="stage-selector_stage-selector_"]').getByText('Stage', {exact: true}).click();
    await page.getByRole('tab', {name: 'Backdrops', exact: true}).click();
    await selectText();
    await addSystemFont('Verdana');
    await chooseFont('Tahoma');

    await page.locator('[class*="sprite-selector_sprite_"]').getByText('Sprite1', {exact: true}).click();
    await page.getByText('Costumes', {exact: true}).click();
    await selectText();
    await chooseFont('Verdana');
    await openFontList();
    await expect(dialog.getByText('Tahoma', {exact: true})).toBeVisible();
    await expect(dialog.getByText('Verdana', {exact: true})).toBeVisible();
    await closeFontList();
});
