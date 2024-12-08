import req from '../../util/req.js';
import { load } from 'cheerio';
import { ua, init ,detail as _detail ,proxy ,play ,test } from '../../util/pan.js';
import dayjs from 'dayjs';

let url = 'https://tv.yydsys.top';
async function request(reqUrl) {
    const resp = await req.get(reqUrl, {
        headers: {
            'User-Agent': ua,
        },
    });
    return resp.data;
}

async function home(_inReq, _outResp) {
    let fiters = '';
    let classes = [{'type_id':'1','type_name':'电影'},{'type_id':'2','type_name':'剧集'},{'type_id':'4','type_name':'动漫'},{'type_id':'3','type_name':'综艺'},{'type_id':'5','type_name':'短剧'},{'type_id':'20','type_name':'纪录片'}];
    let filterObj = {};
    return({
        class: classes,
        filters: filterObj,
    });
    
}

function fixImgUrl(imgUrl) {
    if (imgUrl.startsWith('/img.php?url=')) {
        return imgUrl.substr(13);
    }
    return imgUrl;
}


function getFilterUrlPart(extend, part) {
    let result = '';
    if (extend[part]) {
        result = '/' + part + '/' + extend[part];
    }
    return result;
}

async function category(inReq, _outResp) {
    const tid = inReq.body.id;
    const pg = inReq.body.page;
    let page = pg || 1;
    if (page == 0) page = 1;
    let reqUrl = url + `/index.php/vod/show/id/${tid}/page/${pg}.html`;
    let html = await request(reqUrl, ua);
    const $ = load(html);
    let items = $('#main .module-item');
    let videos = [];
    for(var item of items) {
        let href = $(item).find('.module-item-pic a').attr('href');
        let name = $(item).find('.module-item-pic img').attr('alt');
        let pic = $(item).find('.module-item-pic img').attr('data-src');
        let remark = $(item).find('.module-item-text').text();
        videos.push({
            vod_id: href,
            vod_name: name,
            vod_pic: pic,
            vod_remarks: remark,
        });
    }

    const hasMore = $('#page > a:contains(下一页)').length > 0;
    const pgCount = hasMore ? parseInt(page) + 1 : parseInt(page);
    return ({
        page: parseInt(page),
        pagecount: pgCount,
        limit: 72,
        total: 72 * pgCount,
        list: videos,
    });
}

async function detail(inReq, _outResp) {
    const ids = !Array.isArray(inReq.body.id) ? [inReq.body.id] : inReq.body.id;
    const videos = [];
    for (const id of ids) {
        const html = await request(url + id);
        const $ = load(html);
        let vod = {
            vod_id: id,
            vod_name: $('.page-title')[0].children[0].data,
            vod_pic: $($('.mobile-play')).find('.lazyload')[0].attribs['data-src'],
 
        };
       

        const shareUrls = $('div.module-row-info p')
            .map((_, p) => p.children[0].data)
            .get();
        const vodFromUrl = await _detail(shareUrls);
        if (vodFromUrl){
            vod.vod_play_from = vodFromUrl.froms;
            vod.vod_play_url = vodFromUrl.urls;
        }
        videos.push(vod);
    }
    return {
        list: videos,
    };
}


async function search(inReq, _outResp) {
    const pg = inReq.body.page;
    const wd = inReq.body.wd;
    let page = pg || 1;
    if (page == 0) page = 1;
    const html = await request(`${url}/index.php/vod/search/wd/${wd}.html`);
    const $ = load(html);
    const videos = $('div.module-items > div.module-search-item')
        .map((_, div) => {
            const t = $(div).find('div.video-info-header h3 a')[0];
            return {
                vod_id: t.attribs.href.match(/detail\/id\/(.*).html/)[1],
                vod_name: t.attribs.title,
                vod_pic: fixImgUrl($(div).find('div.module-item-pic img')[0].attribs['data-src']),
                vod_remarks: $(div).find('a.video-serial').text(),
            };
        })
        .get();
    return {
        page: page,
        pagecount: videos.length < 10 ? page : page + 1,
        list: videos,
    };
}


export default {
    meta: {
        key: 'duoduo',
        name: '🟢 多多',
        type: 3,
    },
    api: async (fastify) => {
        fastify.post('/init', init);
        fastify.post('/home', home);
        fastify.post('/category', category);
        fastify.post('/detail', detail);
        fastify.post('/play', play);
        fastify.post('/search', search);
        fastify.get('/proxy/:site/:what/:flag/:shareId/:fileId/:end', proxy);
        fastify.get('/test', test);
    },
};
