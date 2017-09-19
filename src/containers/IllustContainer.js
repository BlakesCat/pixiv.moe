import styles from '@/styles/Illust.scss';

import React from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import CSSModules from 'react-css-modules';
import Layout from 'react-mdl/lib/Layout/Layout';
import Header from 'react-mdl/lib/Layout/Header';
import Content from 'react-mdl/lib/Layout/Content';
import Icon from 'react-mdl/lib/Icon';
import { Chip, ChipContact } from 'react-mdl/lib/Chip';
import Button from 'react-mdl/lib/Button';
import { List } from 'react-mdl/lib/List';
import shortid from 'shortid';
import Img from 'react-image';

import config from '@/config';

import { IllustActions } from '@/actions';
import { Alert, Comment, Loading, Message } from '@/components';
import { LoginContainer } from '@/containers';
import { cachedFetch, moment, Storage } from '@/utils';

@CSSModules(styles, { allowMultiple: true })
export class IllustContainerWithoutStore extends React.Component {
  constructor(props) {
    super(props);

    this.illustId = this.props.match.params.illustId;
  }

  componentDidMount() {
    this.layoutDOMNode = ReactDOM.findDOMNode(this.layoutRef);

    if (!this.item.id) {
      this.props.dispatch(IllustActions.fetchItem(this.illustId));
    }

    this.props.dispatch(IllustActions.fetchComments(this.illustId));
    this.authTimer = setInterval(() => {
      const authData = Storage.get('auth');
      if (authData === null) {
        return;
      }
      if (authData.expires_at < moment().unix()) {
        Storage.remove('auth');
      }
    }, 500);
  }

  componentWillUnmount() {
    this.props.dispatch(IllustActions.clearComments());
    clearInterval(this.authTimer);
  }

  get item() {
    if (!this.props.illust.items[this.illustId]) {
      return {
        title: ''
      };
    }
    return this.props.illust.items[this.illustId];
  }

  renderHeaderTitle() {
    return (
      <span>
        <a className={styles['back-link']} href="#" onClick={this.onBackClick}>
          <Icon className={styles['back-icon']} name="arrow_back" />
        </a>
        <span>{this.item.title}</span>
      </span>
    );
  }

  @autobind
  onBackClick(event) {
    event.preventDefault();
    event.stopPropagation();
    if (this.props.history.length > 1) {
      this.props.history.goBack();
    } else {
      this.props.history.push('/');
    }
  }

  @autobind
  onFavouriteClick(event) {
    const authData = Storage.get('auth');
    if (authData === null || authData.expires_at < moment().unix()) {
      return this.loginRef.open();
    }
    const target = event.nativeEvent.target,
      body = document.body;
    if (target.classList.contains('fn-wait')) {
      return;
    }
    target.classList.add('fn-wait');
    body.classList.add('fn-wait');
    cachedFetch(`${config.apiBaseURL}${config.favouriteURI}/${this.illustId}`, {
      mode: 'cors',
      method: 'put',
      timeout: 10e3,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Access-Token': authData.access_token
      }
    })
      .then(data => {
        target.classList.remove('fn-wait');
        body.classList.remove('fn-wait');
        this.alertRef.setContent(data.message);
      })
      .catch(() => {
        target.classList.remove('fn-wait');
        body.classList.remove('fn-wait');
        // text from SIF
        this.alertRef.setContent('通信エラーが発生しました');
      });
  }

  @autobind
  onDownloadClick() {
    const tempLink = document.createElement('a');
    tempLink.href = this.item.image_urls.large;
    tempLink.setAttribute('download', `${this.item.title}.jpg`);
    tempLink.setAttribute('target', '_blank');
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);
  }

  @autobind
  onTwitterClick() {
    window.open(
      `https://twitter.com/intent/tweet?original_referer=${encodeURIComponent(
        window.location.href
      )}&ref_src=twsrc%5Etfw&text=${encodeURIComponent(
        `${this.item.title} | ${this.item.user.name} #pixiv`
      )}&tw_p=tweetbutton&url=${encodeURIComponent(
        `${config.baseURL}${this.item.id}`
      )}`,
      '_blank',
      'width=550,height=370'
    );
  }

  @autobind
  onTagClick(tag) {
    const link = document.createElement('a');
    link.href = `https://www.pixiv.net/search.php?s_mode=s_tag_full&word=${encodeURIComponent(
      tag
    )}`;
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  @autobind
  scrollListener(event) {
    if (this.props.illust.isFetchingComments) {
      return;
    }
    if (this.props.illust.isCommentsEnd) {
      return;
    }
    const target = event.nativeEvent.target,
      targetHeight = target.clientHeight,
      scrollTop = target.scrollTop,
      scrollHeight = target.scrollHeight;
    if (scrollTop + targetHeight - scrollHeight > -200) {
      this.props.dispatch(IllustActions.fetchComments(this.illustId));
    }
  }

  renderContent() {
    if (this.props.illust.isFetching) {
      return <Loading isHidden={false} />;
    }
    if (this.props.illust.isError) {
      return <Message isHidden={false} text="エラーが発生しました" />;
    }
    try {
      return (
        <div styleName="illust">
          <div styleName="image">
            {this.item.metadata === null ? (
              <Img
                src={[
                  this.item.image_urls.large,
                  this.item.image_urls.px_480mw
                ]}
                loader={<Loading isHidden={false} />}
              />
            ) : (
              this.item.metadata.pages.map(elem => {
                return (
                  <Img
                    key={shortid.generate()}
                    src={[elem.image_urls.large, elem.image_urls.px_480mw]}
                    loader={<Loading isHidden={false} />}
                  />
                );
              })
            )}
          </div>
          <div styleName="tags">
            {this.item.tags.map(elem => {
              return (
                <Chip
                  key={shortid.generate()}
                  onClick={() => this.onTagClick(elem)}>
                  <ChipContact>#</ChipContact>
                  {elem}
                </Chip>
              );
            })}
          </div>
          <div styleName="actions">
            <Button raised ripple onClick={this.onFavouriteClick}>
              ブックマークに追加
            </Button>
            <Button raised ripple onClick={this.onDownloadClick}>
              ダウンロード
            </Button>
            <Button raised ripple onClick={this.onTwitterClick}>
              ツイート
            </Button>
          </div>
          <div styleName="detail">
            <div>
              <div styleName="author">
                <a
                  target="_blank"
                  href={`http://pixiv.me/${this.item.user.account}`}>
                  {this.item.user.name}
                </a>
              </div>
              <time>
                {`${moment(this.item.created_time).format('LLL')}(JST)`}
              </time>
            </div>
            <p>
              <a target="_blank" href={`/${this.item.id}`}>
                pixivにリダイレクトする
              </a>
            </p>
          </div>
          <div styleName="comments">
            {this.props.illust.comments.length === 0 ? (
              <h4>コメントはありません</h4>
            ) : (
              <h4>コメント</h4>
            )}
            <List style={{ width: 'auto' }}>
              {this.props.illust.comments.map(elem => {
                return <Comment key={shortid.generate()} item={elem} />;
              })}
            </List>
            <Loading isHidden={!this.props.illust.isFetchingComments} />
          </div>
          <LoginContainer ref={ref => (this.loginRef = ref)} />
          <Alert ref={ref => (this.alertRef = ref)} />
        </div>
      );
    } catch (e) {
      return <Message isHidden={false} text="エラーが発生しました" />;
    }
  }

  render() {
    return (
      <Layout
        fixedHeader
        id="illust-layout"
        ref={ref => (this.layoutRef = ref)}
        onScroll={this.scrollListener}>
        <Header id="illust-title" title={this.renderHeaderTitle()} />
        <Content>{this.renderContent()}</Content>
      </Layout>
    );
  }
}

export default connect(state => ({ illust: state.illust }))(
  IllustContainerWithoutStore
);
