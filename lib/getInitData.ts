export function getInitData(): string {
  //TODO: убрать условие и сделать нормальную проверку
  if (typeof window !== "undefined" && window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData;
  }
  return "user=%7B%22id%22%3A548019148%2C%22first_name%22%3A%22%D0%A1%D0%B5%D1%80%D0%B3%D0%B5%D0%B9%22%2C%22last_name%22%3A%22%D0%9E%D0%BD%D0%B8%D1%89%D0%B5%D0%BD%D0%BA%D0%BE%22%2C%22username%22%3A%22OnyshchenkoSergey%22%2C%22language_code%22%3A%22uk%22%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%5C%2F%5C%2Ft.me%5C%2Fi%5C%2Fuserpic%5C%2F320%5C%2Fqf0qiya3lYZumE5ExiC55ONcmy-5vzP6pZzzBMV92vw.svg%22%7D&chat_instance=2337466967032439365&chat_type=private&auth_date=1756120426&signature=mdGQ7UJyhhHYjP3-AsE5tn6HFTGP2LGh1Y_DRkgQTZAkmAHy-pYlqcRtJXHxUrK15v0-Y6sp3ktT2rMwszthDA&hash=b2e3a2aa200dd954538a7d65de4dafeab9f4967ca7381bd2d8a746d4d28ad0a9";
}
