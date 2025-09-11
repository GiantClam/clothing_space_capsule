const express = require('express');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const axios = require('axios');

const router = express.Router();
const prisma = new PrismaClient();

// RunningHub Webhook 回调
router.post('/webhook', async (req, res) => {
  try {
    const { taskId, status, resultUrl, error } = req.body;

    // 验证 webhook 签名（如果 RunningHub 提供）
    if (process.env.RUNNINGHUB_WEBHOOK_SECRET) {
      const signature = req.headers['x-runninghub-signature'];
      if (!verifyWebhookSignature(req.body, signature)) {
        return res.status(403).json({ error: '签名验证失败' });
      }
    }

    if (!taskId) {
      return res.status(400).json({ error: '缺少任务ID' });
    }

    // 查找任务
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        user: {
          select: {
            openId: true,
            isVerified: true
          }
        },
        clothes: {
          select: {
            name: true,
            youzanUrl: true
          }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }

    // 更新任务状态
    const updateData = {
      status: status === 'completed' ? 'COMPLETED' : 
              status === 'failed' ? 'FAILED' : 'PROCESSING',
      updatedAt: new Date()
    };

    if (resultUrl) {
      updateData.resultUrl = resultUrl;
    }

    if (error) {
      updateData.errorMessage = error;
    }

    await prisma.task.update({
      where: { id: taskId },
      data: updateData
    });

    // 如果任务完成，发送微信消息给用户
    if (status === 'completed' && resultUrl && task.user.isVerified) {
      await sendCompletionMessage(task.user.openId, {
        resultUrl,
        clothesName: task.clothes.name,
        distributionUrl: task.distributionUrl,
        youzanUrl: task.clothes.youzanUrl
      });
    }

    res.json({ success: true });

  } catch (error) {
    console.error('处理 RunningHub webhook 错误:', error);
    res.status(500).json({ error: '处理回调失败' });
  }
});

// 查询 RunningHub 任务状态
router.get('/task/:runninghubTaskId', async (req, res) => {
  try {
    const { runninghubTaskId } = req.params;

    const response = await axios.get(
      `${process.env.RUNNINGHUB_API_URL}/tasks/${runninghubTaskId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.RUNNINGHUB_API_KEY}`
        }
      }
    );

    res.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('查询 RunningHub 任务状态错误:', error);
    res.status(500).json({ 
      error: '查询任务状态失败',
      message: error.message 
    });
  }
});

// 发送完成消息给用户
async function sendCompletionMessage(openId, { resultUrl, clothesName, distributionUrl, youzanUrl }) {
  try {
    const accessToken = await getWechatAccessToken();
    
    // 发送图片消息
    const imageMessage = {
      touser: openId,
      msgtype: 'image',
      image: {
        media_id: await uploadImageToWechat(resultUrl, accessToken)
      }
    };

    await axios.post(
      `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${accessToken}`,
      imageMessage
    );

    // 发送文本消息
    let messageContent = `🎉 试穿完成！\n\n衣服：${clothesName}`;
    
    // 优先使用分销链接，其次使用普通链接
    const purchaseUrl = distributionUrl || youzanUrl;
    if (purchaseUrl) {
      messageContent += `\n\n🛒 购买链接：${purchaseUrl}`;
    }
    
    const textMessage = {
      touser: openId,
      msgtype: 'text',
      text: {
        content: messageContent
      }
    };

    await axios.post(
      `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${accessToken}`,
      textMessage
    );

    // 记录消息
    await prisma.wechatMessage.create({
      data: {
        userId: (await prisma.user.findUnique({ where: { openId } })).id,
        messageType: 'image',
        content: resultUrl
      }
    });

  } catch (error) {
    console.error('发送完成消息失败:', error);
  }
}

// 上传图片到微信
async function uploadImageToWechat(imageUrl, accessToken) {
  try {
    // 下载图片
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    
    // 上传到微信
    const formData = new FormData();
    formData.append('media', imageResponse.data, 'image.jpg');
    
    const uploadResponse = await axios.post(
      `https://api.weixin.qq.com/cgi-bin/media/upload?access_token=${accessToken}&type=image`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    return uploadResponse.data.media_id;
  } catch (error) {
    console.error('上传图片到微信失败:', error);
    throw error;
  }
}

// 获取微信 access_token
async function getWechatAccessToken() {
  const response = await axios.get(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${process.env.WECHAT_APP_ID}&secret=${process.env.WECHAT_APP_SECRET}`
  );
  
  if (response.data.errcode) {
    throw new Error(`获取 access_token 失败: ${response.data.errmsg}`);
  }
  
  return response.data.access_token;
}

// 验证 webhook 签名
function verifyWebhookSignature(payload, signature) {
  if (!signature || !process.env.RUNNINGHUB_WEBHOOK_SECRET) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RUNNINGHUB_WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');

  return signature === `sha256=${expectedSignature}`;
}

module.exports = router;
