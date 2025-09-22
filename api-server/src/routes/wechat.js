const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const QRCode = require('qrcode');
const crypto = require('crypto');
const axios = require('axios');
const xml2js = require('xml2js');

const router = express.Router();
const prisma = new PrismaClient();

// 生成关注二维码（使用设备MAC地址）
router.post('/qrcode', async (req, res) => {
  try {
    const { deviceId, macAddress } = req.body;
    
    // 需要设备ID或MAC地址
    if (!deviceId && !macAddress) {
      return res.status(400).json({ error: '设备ID或MAC地址不能为空' });
    }

    let device = null;
    let sceneStr = '';
    
    // 如果提供了设备ID，验证设备是否存在
    if (deviceId) {
      device = await prisma.device.findUnique({
        where: { id: deviceId }
      });

      if (!device) {
        return res.status(404).json({ error: '设备不存在' });
      }
      
      // 使用设备ID生成场景值
      sceneStr = `device_${deviceId}_${Date.now()}`;
    } 
    // 如果提供了MAC地址，使用MAC地址生成场景值
    else if (macAddress) {
      sceneStr = `mac_${macAddress}_${Date.now()}`;
    }

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

    // 保存二维码信息到数据库
    const wechatQRCode = await prisma.wechatQRCode.create({
      data: {
        sceneStr: sceneStr,
        ticket: ticket,
        expireTime: new Date(Date.now() + 300 * 1000), // 5分钟后过期
        deviceId: deviceId || null
      }
    });

    // 生成二维码图片的 base64
    const qrCodeDataURL = await QRCode.toDataURL(qrCodeUrl);

    res.json({
      success: true,
      qrCode: {
        url: qrCodeUrl,
        dataURL: qrCodeDataURL,
        sceneStr: sceneStr,
        qrCodeId: wechatQRCode.id,
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

// 生成下载二维码
router.post('/download-qr', async (req, res) => {
  try {
    const { imageUrl, clothingInfo, openid } = req.body;

    if (!imageUrl || !clothingInfo || !openid) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }

    // 生成二维码数据
    const qrData = {
      imageUrl: imageUrl,
      clothingInfo: clothingInfo,
      openid: openid,
      timestamp: Date.now()
    };

    // 生成二维码
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({
      success: true,
      qrCode: qrCodeDataURL,
      message: '二维码生成成功'
    });
  } catch (error) {
    console.error('生成下载二维码错误:', error);
    res.status(500).json({
      success: false,
      error: '生成二维码失败: ' + error.message
    });
  }
});

// 微信回调处理
router.post('/callback', async (req, res) => {
  try {
    // 解析XML数据
    let data = req.body;
    
    // 如果是XML格式，需要解析
    if (typeof req.body === 'string' && req.body.startsWith('<xml>')) {
      const result = await xml2js.parseStringPromise(req.body, { explicitArray: false });
      data = result.xml;
    }

    const { signature, timestamp, nonce, openid, Event: event, EventKey: eventKey } = data;

    // 验证签名
    const token = process.env.WECHAT_TOKEN;
    const tmpArr = [token, timestamp, nonce].sort();
    const tmpStr = tmpArr.join('');
    const hashCode = crypto.createHash('sha1').update(tmpStr).digest('hex');

    if (hashCode !== signature) {
      return res.status(403).send('签名验证失败');
    }

    // 处理关注事件
    if (event === 'subscribe') {
      const sceneStr = eventKey?.replace('qrscene_', '');
      
      if (sceneStr) {
        let device = null;
        let macAddress = null;
        
        // 查找对应的二维码记录
        const qrCode = await prisma.wechatQRCode.findUnique({
          where: { sceneStr: sceneStr }
        });

        if (qrCode && qrCode.deviceId) {
          // 通过设备ID查找设备
          device = await prisma.device.findUnique({
            where: { id: qrCode.deviceId }
          });
        } else if (sceneStr.startsWith('mac_')) {
          // 从场景值中提取MAC地址
          macAddress = sceneStr.split('_')[1];
        }

        // 创建或更新微信用户
        const wechatUser = await prisma.wechatUser.upsert({
          where: { openid: openid },
          update: {
            subscribe: true,
            subscribeTime: new Date(),
            deviceId: device ? device.id : qrCode?.deviceId || null,
            updatedAt: new Date()
          },
          create: {
            openid: openid,
            subscribe: true,
            subscribeTime: new Date(),
            deviceId: device ? device.id : qrCode?.deviceId || null
          }
        });

        // 如果有设备信息，也更新用户表
        if (device) {
          await prisma.user.upsert({
            where: { openId: openid },
            update: {
              deviceId: device.id,
              isVerified: true,
              updatedAt: new Date()
            },
            create: {
              openId: openid,
              deviceId: device.id,
              isVerified: true
            }
          });
        }

        // 发送欢迎消息
        await sendWelcomeMessage(openid);

        // 更新二维码状态
        if (qrCode) {
          await prisma.wechatQRCode.update({
            where: { id: qrCode.id },
            data: { 
              userId: wechatUser.id,
              status: 'USED',
              updatedAt: new Date()
            }
          });
        }

        res.send('success');
        return;
      }
    }

    // 处理取消关注事件
    if (event === 'unsubscribe') {
      // 更新微信用户订阅状态
      await prisma.wechatUser.updateMany({
        where: { openid: openid },
        data: { 
          subscribe: false,
          unsubscribeTime: new Date(),
          updatedAt: new Date()
        }
      });
      
      // 更新用户表订阅状态
      await prisma.user.updateMany({
        where: { openId: openid },
        data: { isVerified: false }
      });
    }

    res.send('success');

  } catch (error) {
    console.error('微信回调处理错误:', error);
    res.status(500).send('处理回调失败');
  }
});

// 检查用户关注状态（支持设备ID和MAC地址）
router.get('/status/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const { type } = req.query; // 'device' 或 'mac'

    let wechatUser = null;

    if (type === 'mac') {
      // 通过MAC地址查找关联的微信用户
      const devices = await prisma.device.findMany({
        where: { macAddress: identifier }
      });

      if (devices.length > 0) {
        // 查找与设备关联的微信用户
        wechatUser = await prisma.wechatUser.findFirst({
          where: { 
            deviceId: { in: devices.map(d => d.id) },
            subscribe: true
          },
          orderBy: { subscribeTime: 'desc' }
        });
      }
    } else {
      // 通过设备ID查找
      const device = await prisma.device.findUnique({
        where: { id: identifier },
        include: {
          users: {
            where: { isVerified: true },
            orderBy: { updatedAt: 'desc' },
            take: 1
          }
        }
      });

      if (device && device.users.length > 0) {
        // 查找对应的微信用户
        wechatUser = await prisma.wechatUser.findUnique({
          where: { openid: device.users[0].openId }
        });
      }
    }

    const isSubscribed = wechatUser && wechatUser.subscribe;

    res.json({
      success: true,
      isSubscribed: isSubscribed,
      user: isSubscribed ? {
        id: wechatUser.id,
        openid: wechatUser.openid,
        subscribeTime: wechatUser.subscribeTime,
        nickname: wechatUser.nickname,
        headimgurl: wechatUser.headimgurl
      } : null
    });

  } catch (error) {
    console.error('检查关注状态错误:', error);
    res.status(500).json({ error: '检查状态失败' });
  }
});

// 推送试装结果到用户
router.post('/push-tryon-result', async (req, res) => {
  try {
    const { macAddress, imageUrl, purchaseUrl, clothesName } = req.body;

    if (!macAddress || !imageUrl || !purchaseUrl || !clothesName) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }

    // 查找设备
    const device = await prisma.device.findUnique({
      where: { macAddress: macAddress }
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: '设备不存在'
      });
    }

    // 查找与设备关联的微信用户
    const wechatUser = await prisma.wechatUser.findFirst({
      where: { 
        deviceId: device.id,
        subscribe: true
      },
      orderBy: { subscribeTime: 'desc' }
    });

    if (!wechatUser) {
      return res.status(404).json({
        success: false,
        error: '未找到已关注的微信用户'
      });
    }

    // 发送图片消息
    const accessToken = await getWechatAccessToken();
    
    // 先发送文本消息
    const textMessage = {
      touser: wechatUser.openid,
      msgtype: 'text',
      text: {
        content: `您的试装效果已完成！\n服装：${clothesName}\n点击下方链接查看试装效果和购买信息。`
      }
    };

    await axios.post(
      `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${accessToken}`,
      textMessage
    );

    // 然后发送图片消息
    const imageMessage = {
      touser: wechatUser.openid,
      msgtype: 'image',
      image: {
        media_id: await uploadImageToWechat(imageUrl, accessToken)
      }
    };

    await axios.post(
      `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${accessToken}`,
      imageMessage
    );

    // 最后发送购买链接（图文消息）
    const newsMessage = {
      touser: wechatUser.openid,
      msgtype: 'news',
      news: {
        articles: [{
          title: `立即购买：${clothesName}`,
          description: '点击查看详情并购买',
          url: purchaseUrl,
          picurl: imageUrl
        }]
      }
    };

    await axios.post(
      `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${accessToken}`,
      newsMessage
    );

    res.json({
      success: true,
      message: '推送成功'
    });

  } catch (error) {
    console.error('推送试装结果错误:', error);
    res.status(500).json({
      success: false,
      error: '推送失败: ' + error.message
    });
  }
});

// 上传图片到微信服务器
async function uploadImageToWechat(imageUrl, accessToken) {
  try {
    // 首先下载图片
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    
    // 上传到微信服务器
    const formData = new FormData();
    formData.append('media', new Blob([imageResponse.data]), 'image.jpg');
    
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
    throw new Error(`上传图片到微信失败: ${error.message}`);
  }
}

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