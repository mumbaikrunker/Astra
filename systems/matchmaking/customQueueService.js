const { query } = require('../../database/postgres');

async function createCustomQueue(
    guildId,
    queueName,
    queueSize,
    channelId
) {
    const sql = `
        INSERT INTO custom_queues
        (
            guild_id,
            queue_name,
            queue_size,
            channel_id
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `;

    const result = await query(sql, [
        guildId,
        queueName,
        queueSize,
        channelId
    ]);

    return result.rows[0];
}

async function getCustomQueues(guildId) {
    const sql = `
        SELECT *
        FROM custom_queues
        WHERE guild_id = $1
        ORDER BY id ASC
    `;

    const result = await query(sql, [guildId]);

    return result.rows;
}

async function getCustomQueue(id) {
    const sql = `
        SELECT *
        FROM custom_queues
        WHERE id = $1
        LIMIT 1
    `;

    const result = await query(sql, [id]);

    return result.rows[0] || null;
}

async function updateCustomQueue(
    id,
    updates
) {
    const fields = [];
    const values = [];

    let index = 1;

    if (updates.queue_name !== undefined) {
        fields.push(`queue_name = $${index++}`);
        values.push(updates.queue_name);
    }

    if (updates.queue_size !== undefined) {
        fields.push(`queue_size = $${index++}`);
        values.push(updates.queue_size);
    }

    if (updates.channel_id !== undefined) {
        fields.push(`channel_id = $${index++}`);
        values.push(updates.channel_id);
    }

    if (fields.length === 0) {
        return null;
    }

    values.push(id);

    const sql = `
        UPDATE custom_queues
        SET ${fields.join(', ')}
        WHERE id = $${index}
        RETURNING *
    `;

    const result = await query(
        sql,
        values
    );

    return result.rows[0] || null;
}

async function deleteCustomQueue(id) {
    const sql = `
        DELETE FROM custom_queues
        WHERE id = $1
        RETURNING *
    `;

    const result = await query(sql, [id]);

    return result.rows[0] || null;
}

module.exports = {
    createCustomQueue,
    getCustomQueues,
    getCustomQueue,
    updateCustomQueue,
    deleteCustomQueue
};