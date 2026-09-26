import { MessageCircle, Book, FileText, Video, Mail, Search } from 'lucide-react';

export function Help() {
  const helpCategories = [
    {
      icon: Book,
      title: 'Tài liệu',
      description: 'Hướng dẫn chi tiết và API documentation',
      link: '#',
    },
    {
      icon: Video,
      title: 'Video hướng dẫn',
      description: 'Các video tutorial từng bước',
      link: '#',
    },
    {
      icon: MessageCircle,
      title: 'Live Chat',
      description: 'Chat trực tiếp với đội ngũ hỗ trợ',
      link: '#',
    },
    {
      icon: Mail,
      title: 'Email Support',
      description: 'Gửi email cho chúng tôi',
      link: '#',
    },
  ];

  const faqs = [
    {
      question: 'Làm sao để thêm influencer mới vào danh sách?',
      answer: 'Vào mục "Tìm kiếm", sử dụng bộ lọc để tìm influencer phù hợp, sau đó click vào nút "Thêm vào danh sách".',
    },
    {
      question: 'Tôi có thể xuất dữ liệu không?',
      answer: 'Có, bạn có thể xuất dữ liệu ở định dạng CSV hoặc Excel từ mỗi danh sách.',
    },
    {
      question: 'Làm sao để liên hệ với influencer?',
      answer: 'Click vào profile của influencer, chọn tab "Nhắn tin" để gửi tin nhắn hoặc sử dụng thông tin liên hệ được cung cấp.',
    },
    {
      question: 'Tôi có thể mời thêm thành viên vào team không?',
      answer: 'Có, vào mục "Users & Teams" và click "Mời thành viên". Số lượng thành viên phụ thuộc vào gói bạn đang sử dụng.',
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground mb-3">Trung tâm hỗ trợ</h1>
        <p className="text-muted-foreground">Chúng tôi luôn sẵn sàng hỗ trợ bạn</p>
      </div>

      {/* Search */}
      <div className="bg-card rounded-xl border border-border p-4 mb-8">
        <div className="relative">
          <Search className="w-5 h-5 text-muted-foreground/70 absolute left-4 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm câu hỏi, tài liệu..."
            className="w-full pl-12 pr-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Help Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {helpCategories.map((category, index) => (
          <a
            key={index}
            href={category.link}
            className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-all group"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-all">
              <category.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">{category.title}</h3>
            <p className="text-sm text-muted-foreground">{category.description}</p>
          </a>
        ))}
      </div>

      {/* FAQs */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <FileText className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Câu hỏi thường gặp</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="pb-4 border-b border-border last:border-0">
              <h3 className="font-semibold text-foreground mb-2">{faq.question}</h3>
              <p className="text-muted-foreground text-sm">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Card */}
      <div className="mt-8 bg-gradient-to-r from-primary/10 to-primary/15 rounded-xl border border-primary/20 p-8 text-center">
        <h3 className="text-xl font-semibold text-foreground mb-2">Vẫn cần hỗ trợ?</h3>
        <p className="text-muted-foreground mb-4">Đội ngũ của chúng tôi sẵn sàng giúp đỡ bạn</p>
        <div className="flex gap-3 justify-center">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-all font-medium">
            <MessageCircle className="w-4 h-4" />
            Chat ngay
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-card text-foreground rounded-full hover:bg-muted/50 transition-all font-medium border border-border">
            <Mail className="w-4 h-4" />
            Gửi email
          </button>
        </div>
      </div>
    </div>
  );
}
