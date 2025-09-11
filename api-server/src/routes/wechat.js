const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const QRCode = require('qrcode');
const crypto = require('crypto');
const axios = require('axios');
const xml2js = require('xml2js');

const router = express.Router();
const prisma = new PrismaClient();

// 生成关注二维码
router.post('/qrcode', async (req, res) => {
  try {
    const { deviceId } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({ error: '设备ID不能为空' });
    }

    // 验证设备是否存在
    const device = await prisma.device.findUnique({
      where: { id: deviceId }
    });

    if (!device) {
      return res.status(404).json({ error: '设备不存在' });
    }

    // 生成临时二维码场景值
    const sceneStr = `device_${deviceId}_${Date.now()}`;
    
    // 获取微信 access_token
    const tokenResponse = await axios.get(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${process.env.WECHAT_APP_ID}&secret=${process.env.WECHAT_APP_SECRET}`
    );

    if (tokenResponse.data.errcode) {
      throw new Error(`获取 access_token 失败: ${tokenResponse.data.errmsg}`);
    }

    const accessToken = tokenResponse.data.access_token;

    // 创建临时二维码
    const qrResponse = await axios.post(
      `https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=${accessToken}`,
      {
        expire_seconds: 300, // 5分钟过期
        action_name: 'QR_STR_SCENE',
        action_info: {
          scene: {
            scene_str: sceneStr
          }
        }
      }
    );

    if (qrResponse.data.errcode) {
      throw new Error(`创建二维码失败: ${qrResponse.data.errmsg}`);
    }

    const ticket = qrResponse.data.ticket;
    const qrCodeUrl = `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(ticket)}`;

    // 生成二维码图片的 base64
    const qrCodeDataURL = await QRCode.toDataURL(qrCodeUrl);

    res.json({
      success: true,
      qrCode: {
        url: qrCodeUrl,
        dataURL: qrCodeDataURL,
        sceneStr,
        expiresIn: 300
      }
    });

  } catch (error) {
    console.error('生成二维码错误:', error);
    res.status(500).json({ 
      error: '生成二维码失败',
      message: error.message 
    });
  }
});

// 微信回调处理
router.post('/callback', async (req, res) => {
  try {
    const { signature, timestamp, nonce, openid, event } = req.body;

    // 验证签名
    const token = process.env.WECHAT_TOKEN;
    const tmpArr = [token, timestamp, nonce].sort();
    const tmpStr = tmpArr.join('');
    const hashCode = crypto.createHash('sha1').update(tmpStr).digest('hex');

    if (hashCode !== signature) {
      return res.status(403).json({ error: '签名验证失败' });
    }

    // 处理关注事件
    if (event === 'subscribe') {
      const sceneStr = req.body.EventKey?.replace('qrscene_', '');
      
      if (sceneStr && sceneStr.startsWith('device_')) {
        const deviceId = sceneStr.split('_')[1];
        
        // 查找设备
        const device = await prisma.device.findUnique({
          where: { id: deviceId }
        });

        if (device) {
          // 创建或更新用户
          const user = await prisma.user.upsert({
            where: { openId: openid },
            update: {
              deviceId: deviceId,
              isVerified: true,
              updatedAt: new Date()
            },
            create: {
              openId: openid,
              deviceId: deviceId,
              isVerified: true
            }
          });

          // 发送欢迎消息
          await sendWelcomeMessage(openid);

          res.json({ success: true, message: '用户关注成功' });
          return;
        }
      }
    }

    // 处理取消关注事件
    if (event === 'unsubscribe') {
      await prisma.user.updateMany({
        where: { openId: openid },
        data: { isVerified: false }
      });
    }

    res.json({ success: true });

  } catch (error) {
    console.error('微信回调处理错误:', error);
    res.status(500).json({ error: '处理回调失败' });
  }
});

// 检查用户关注状态
router.get('/status/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;

    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        users: {
          where: { isVerified: true },
          orderBy: { updatedAt: 'desc' },
          take: 1
        }
      }
    });

    if (!device) {
      return res.status(404).json({ error: '设备不存在' });
    }

    const hasVerifiedUser = device.users.length > 0;
    const user = hasVerifiedUser ? device.users[0] : null;

    res.json({
      success: true,
      isVerified: hasVerifiedUser,
      user: user ? {
        id: user.id,
        openId: user.openId,
        nickname: user.nickname,
        avatar: user.avatar,
        verifiedAt: user.updatedAt
      } : null
    });

  } catch (error) {
    console.error('检查关注状态错误:', error);
    res.status(500).json({ error: '检查状态失败' });
  }
});

// 发送欢迎消息
async function sendWelcomeMessage(openId) {
  try {
    const accessToken = await getWechatAccessToken();
    
    const message = {
      touser: openId,
      msgtype: 'text',
      text: {
        content: '欢迎关注服装空间胶囊！\n\n现在您可以开始体验虚拟试衣功能了。请返回客户端继续使用。'
      }
    };

    await axios.post(
      `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${accessToken}`,
      message
    );

  } catch (error) {
    console.error('发送欢迎消息失败:', error);
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

module.exports = router;
