import { KnownBlock, HeaderBlock, SectionBlock, DividerBlock, ContextBlock, ActionsBlock } from '@slack/web-api';

/**
 * Fluent builder for Slack Block Kit messages
 */
export class SlackMessageBuilder {
    private blocks: KnownBlock[] = [];

    /**
     * Add a header block
     */
    header(text: string, emoji = true): this {
        this.blocks.push({
            type: 'header',
            text: {
                type: 'plain_text',
                text,
                emoji
            }
        });
        return this;
    }

    /**
     * Add a section block with text
     */
    section(text: string, type: 'mrkdwn' | 'plain_text' = 'mrkdwn'): this {
        this.blocks.push({
            type: 'section',
            text: {
                type,
                text
            }
        });
        return this;
    }

    /**
     * Add a section block with fields
     */
    sectionFields(fields: { label: string; value: string }[]): this {
        this.blocks.push({
            type: 'section',
            fields: fields.map(f => ({
                type: 'mrkdwn',
                text: `*${f.label}:*\n${f.value}`
            }))
        });
        return this;
    }

    /**
     * Add a context block
     */
    context(text: string): this {
        this.blocks.push({
            type: 'context',
            elements: [
                {
                    type: 'mrkdwn',
                    text
                }
            ]
        });
        return this;
    }

    /**
     * Add a divider block
     */
    divider(): this {
        this.blocks.push({
            type: 'divider'
        });
        return this;
    }

    /**
     * Add a code block
     */
    codeBlock(code: string, maxLength = 2500): this {
        // Truncate if too long (Slack limit is 3000 but we leave room)
        const content = code.length > maxLength
            ? code.substring(0, maxLength) + '... (truncated)'
            : code;

        this.blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `\`\`\`${content}\`\`\``
            }
        });
        return this;
    }

    /**
     * Add a link/button section
     */
    linkValidation(text: string, url: string): this {
        this.blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `<${url}|${text}>`
            }
        });
        return this;
    }

    /**
     * Build and return the blocks array
     */
    build(): KnownBlock[] {
        return this.blocks;
    }
}
